"""
backend/server.py — FastAPI HTTP server for JSON video script generation.

This server accepts a topic and returns a structured JSON video script
that the Remotion frontend can render directly.

Usage:
    cd backend
    uvicorn server:app --reload --port 8000
"""

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Bootstrap sys.path so `from config import ...` works when run from backend/
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_FALLBACK_MODEL,
    INTER_AGENT_DELAY_SECONDS,
)
from utils.api import get_client, _PRIMARY_MODEL, _FALLBACK_MODEL, _MODEL_CHAIN

# Agent modules.
# Imported here so the HTTP endpoint can fire them in sequence instead of a
# single LLM call.
from agents import director as _director
from agents import scriptwriter as _scriptwriter
from agents import storyboard as _storyboard
from agents import sync as _sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("server")

# ---------------------------------------------------------------------------
# Remotion best-practice skills loader
# ---------------------------------------------------------------------------

_SKILLS_DIR = (
    _BACKEND_DIR.parent / ".agents" / "skills" / "remotion-best-practices" / "rules"
)


def _load_skill(filename: str) -> str:
    """Read a skill .md file and strip its YAML frontmatter."""
    path = _SKILLS_DIR / filename
    if not path.exists():
        logger.warning("Skill file not found: %s", path)
        return ""
    content = path.read_text()
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3 :].strip()
    return content


def _build_remotion_knowledge() -> str:
    """
    Distil Remotion best-practice knowledge from the skills library into a
    compact, actionable reference block for the LLM system prompt.

    Reads: timing.md, sequencing.md, transitions.md, compositions.md
    Extracts only the rules that matter when authoring a JSON video script.
    """
    # Load raw skill content (used below for inline citation)
    _load_skill("timing.md")  # noqa: confirms file exists
    _load_skill("sequencing.md")  # noqa
    _load_skill("transitions.md")  # noqa
    _load_skill("compositions.md")  # noqa

    return """## REMOTION BEST-PRACTICE REFERENCE
(Sourced from skills/remotion-best-practices — timing, sequencing, transitions, compositions rules)

### Frame budget  (fps = 30, always)
| Duration | Frames |
|----------|--------|
| 1 second | 30     |
| 2 s      | 60     |
| 3 s      | 90     |
| 4 s      | 120    |
| 5 s      | 150    |
| 6 s      | 180    |
| 10 s     | 300    |

Minimum readable durations per component:
- `AnimatedTitle` (title only):           90 frames  (3 s)
- `AnimatedTitle` (title + subtitle):    120 frames  (4 s)
- `ComparisonCard` (3–5 item pairs):     150 frames  (5 s) — items animate in with staggered delay; fewer than 150 frames cuts off the reveal
- Intro scene:   90–150 frames
- Outro / conclusion: 120–600 frames (let the final card breathe)

### Sequencing pattern  (from sequencing.md)
1. Scene 1  → `AnimatedTitle`, `align: "center"`, `transition: "fade"` or `"slideUp"` — the video's title card
2. Scenes 2…N-1 → Alternate `AnimatedTitle` and `ComparisonCard`; never use the same type twice in a row
   - `AnimatedTitle` mid-video: use `align: "left"` for section-header feel
   - `ComparisonCard`: centered automatically, no align prop
3. Final scene → `AnimatedTitle`, `align: "center"`, **`transition: "none"`** — nothing follows it

### Transition rules  ⚠️ critical
In this system, a transition is a 15-frame OVERLAY effect rendered inside the LAST 15 frames of the scene that declares it.
It does NOT overlap the next scene. It does NOT shorten the timeline.

→ **sum(scene.duration_frames) MUST equal duration_seconds × 30 exactly.** Transitions have zero effect on this sum.

Transition choice guide:
- `"fade"`      — calm, neutral; good for intro and reflective scenes
- `"slideLeft"` — forward motion; use between sequential content scenes
- `"slideUp"`   — upward energy; good after a comparison card
- `"zoom"`      — emphasis; use sparingly (1–2 times per video) for a key reveal
- `"none"`      — only for the final scene

### JSON-serializable constraint  (from compositions.md)
All values inside a scene's `"data"` object are passed as Remotion `defaultProps` and MUST be valid JSON:
- ✅  strings, numbers, booleans, arrays of strings/numbers
- ❌  functions, `undefined`, `Date` objects, `Map`, `Set`
Remotion passes `data` directly to the React component as props.
"""


REMOTION_KNOWLEDGE = _build_remotion_knowledge()
logger.info(
    "Loaded Remotion best-practice knowledge block (%d chars)", len(REMOTION_KNOWLEDGE)
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Video Script Generator",
    description="Generates Remotion-compatible JSON video scripts via Groq.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Component system prompts are now handled by graph.nodes.assembler_node

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class GenerateScriptRequest(BaseModel):
    topic: str = Field(..., description="The subject of the educational video")
    context: Optional[str] = Field(
        None, description="Additional context or constraints"
    )
    duration_seconds: int = Field(
        60, ge=10, le=300, description="Target video length in seconds"
    )
    style: str = Field("educational", description="educational | explainer | tutorial")
    write_to_examples: bool = Field(
        True,
        description="If True (default), write the assembled JSON to shared/examples/<slug>.json for Remotion Studio preview.",
    )


class GenerateMeta(BaseModel):
    model_used: str
    fallback_triggered: bool
    generation_time_ms: int
    agents_used: list[str]
    pipeline_mode: str  # "multi-agent" | "single-call"


class GenerateScriptResponse(BaseModel):
    script: dict[str, Any]
    meta: GenerateMeta


class ComponentInfo(BaseModel):
    name: str
    description: str
    props: dict[str, str]


class ComponentListResponse(BaseModel):
    components: list[ComponentInfo]


from graph.pipeline import compiled_graph
from component_catalog import get_catalog

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "primary": _PRIMARY_MODEL,
            "fallback": _FALLBACK_MODEL,
            "chain": _MODEL_CHAIN,
        },
        "skills_loaded": bool(REMOTION_KNOWLEDGE),
        "skills_chars": len(REMOTION_KNOWLEDGE),
    }


@app.get("/api/skills")
def get_skills():
    """
    Return the Remotion best-practice knowledge block that is injected into
    the LLM system prompt on every /api/generate-script call.
    Useful for debugging and for verifying what the LLM agent knows.
    """
    return {
        "source": "skills/remotion-best-practices (timing, sequencing, transitions, compositions)",
        "knowledge": REMOTION_KNOWLEDGE,
        "injected_into": "build_system_prompt() → SYSTEM_PROMPT",
    }


@app.get("/api/examples")
def list_examples():
    """
    List all available video script JSON files in shared/examples/.
    Returns a list of {slug, path, scene_count, title} objects.
    """
    from utils.file_output import list_example_scripts
    import json

    results = []
    for path in list_example_scripts():
        slug = path.stem
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            results.append({
                "slug": slug,
                "title": data.get("title", slug),
                "scene_count": len(data.get("scenes", [])),
                "fps": data.get("fps", 30),
                "total_frames": sum(s.get("duration_frames", 0) for s in data.get("scenes", [])),
                "path": str(path),
            })
        except Exception as exc:
            results.append({"slug": slug, "error": str(exc)})

    return {"examples": results, "count": len(results)}


@app.get("/api/components", response_model=ComponentListResponse)
def list_components():
    """
    Return the list of currently available scene component names and their props.
    """
    catalog = get_catalog()
    components = []
    for name, data in catalog.items():
        # Extrapolate props from schema
        props = {}
        schema = data.get("schema", {}).get("properties", {})
        for k, v in schema.items():
            props[k] = v.get("type", "unknown")

        components.append(
            ComponentInfo(
                name=name, description=data.get("description", ""), props=props
            )
        )

    return ComponentListResponse(components=components)


@app.post("/api/generate-script", response_model=GenerateScriptResponse)
def generate_script(req: GenerateScriptRequest):
    """
    Generate a structured JSON video script using LangGraph pipeline.
    """
    total_frames = req.duration_seconds * 30
    t0 = time.monotonic()

    # Initial state
    initial_state = {
        "topic": req.topic,
        "brief": None,
        "script": None,
        "story": None,
        "timing": None,
        "video_script": None,
        "errors": [],
        "model_used": None,
        "fallback_triggered": False,
    }

    try:
        final_state = compiled_graph.invoke(initial_state)
    except Exception as exc:
        logger.error("Pipeline failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))

    if final_state.get("errors"):
        logger.error("Pipeline errors: %s", final_state["errors"])
        raise HTTPException(status_code=422, detail="; ".join(final_state["errors"]))

    script = final_state.get("video_script", {})
    model_used = final_state.get("model_used", "unknown")
    fallback_triggered = final_state.get("fallback_triggered", False)

    elapsed_ms = int((time.monotonic() - t0) * 1000)

    # Validate required top-level fields
    for field in ("title", "fps", "width", "height", "theme", "scenes"):
        if field not in script:
            raise HTTPException(
                status_code=422,
                detail=f"Assembler output missing required field: '{field}'",
            )

    # Validate scene types against dynamic catalog
    catalog = get_catalog()
    valid_types = set(catalog.keys())
    for scene in script.get("scenes", []):
        stype = scene.get("type")
        if stype not in valid_types:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Scene id={scene.get('id')!r} has invalid type {stype!r}. "
                    f"Valid types: {sorted(valid_types)}"
                ),
            )

    # Validate frame sum
    total = sum(s.get("duration_frames", 0) for s in script.get("scenes", []))
    if total != total_frames:
        logger.warning(
            "Assembler frame sum %d ≠ expected %d — correcting last scene",
            total,
            total_frames,
        )
        scenes = script["scenes"]
        if scenes:
            scenes[-1]["duration_frames"] = max(
                30, scenes[-1]["duration_frames"] + (total_frames - total)
            )

    # Write to shared/examples/<slug>.json for Remotion Studio (dev flow)
    if req.write_to_examples:
        try:
            from utils.file_output import write_example_script
            written_path = write_example_script(script, req.topic)
            logger.info("[server] Wrote example JSON to %s", written_path)
        except Exception as exc:
            logger.warning("[server] Could not write example JSON: %s", exc)

    return GenerateScriptResponse(
        script=script,
        meta=GenerateMeta(
            model_used=model_used,
            fallback_triggered=fallback_triggered,
            generation_time_ms=elapsed_ms,
            agents_used=["director", "scriptwriter", "storyboard", "sync", "assembler"],
            pipeline_mode="langgraph",
        ),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extract_json(text: str) -> str:
    """Strip markdown fences and extract the first JSON object or array."""
    import re

    # Remove markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text)

    # Find the first { and last } to extract the JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1].strip()

    return text.strip()
