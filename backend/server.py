"""
backend/server.py — FastAPI HTTP server for JSON video script generation.

Fires the full LangGraph multi-agent pipeline on every request:
  Director → Scriptwriter → Storyboard → Sync → Assembler

The Assembler selects from all 13 components in componentCatalog.json,
validates output with Pydantic (models/video_script.py), and writes
the result to shared/examples/<slug>.json.

Usage:
    cd backend
    uvicorn server:app --reload --port 8000
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Bootstrap sys.path so local imports work regardless of cwd
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import GROQ_MODEL, GROQ_FALLBACK_MODEL
from graph.pipeline import compiled_graph
from graph.state import PipelineState
from component_catalog import get_catalog
from utils.file_output import write_example_script, list_example_scripts, slugify_topic
from utils.tracing import get_langfuse, flush as flush_langfuse, is_enabled as tracing_enabled

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("server")

# ---------------------------------------------------------------------------
# Remotion best-practice knowledge (served via GET /api/skills)
# The assembler_node reads this directly via the get_remotion_skill tool.
# ---------------------------------------------------------------------------

_SKILLS_DIR = _BACKEND_DIR.parent / ".agents" / "skills" / "remotion-best-practices" / "rules"


def _load_skill(filename: str) -> str:
    """Read a skill .md and strip YAML frontmatter."""
    path = _SKILLS_DIR / filename
    if not path.exists():
        logger.warning("Skill file not found: %s", path)
        return ""
    content = path.read_text()
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:].strip()
    return content


def _build_remotion_knowledge() -> str:
    _load_skill("timing.md")
    _load_skill("sequencing.md")
    _load_skill("transitions.md")
    _load_skill("compositions.md")

    return """## REMOTION BEST-PRACTICE REFERENCE
(Sourced from skills/remotion-best-practices — timing, sequencing, transitions, compositions)

### Frame budget  (fps = 30)
| Duration | Frames |  | Duration | Frames |
|----------|--------|--|----------|--------|
| 1 s      | 30     |  | 5 s      | 150    |
| 2 s      | 60     |  | 6 s      | 180    |
| 3 s      | 90     |  | 8 s      | 240    |
| 4 s      | 120    |  | 10 s     | 300    |

Minimum readable durations:
- AnimatedTitle (title only): 90 frames (3 s)
- AnimatedTitle (title + subtitle): 120 frames (4 s)
- ComparisonCard (3–5 pairs): 150 frames (5 s)
- ArchitectureDiagram: 180–240 frames (6–8 s)
- SplitScreen / BulletList: 150–210 frames (5–7 s)
- Intro / outro: 120–150 frames

### Transition rules
Transitions in this system are 15-frame OVERLAY effects inside the scene's own duration.
They do NOT overlap the next scene → sum(duration_frames) MUST equal duration_seconds × 30.
- "fade": calm reveals
- "slideLeft": forward motion between content scenes
- "slideUp": after a comparison or diagram
- "zoom": key emphasis (use 1–2× per video max)
- "none": ONLY for the very last scene
"""


REMOTION_KNOWLEDGE = _build_remotion_knowledge()
logger.info("Loaded Remotion knowledge block (%d chars)", len(REMOTION_KNOWLEDGE))

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Video Script Generator",
    description=(
        "Multi-agent LangGraph pipeline that generates Remotion-compatible JSON video scripts. "
        "Pipeline: Director → Scriptwriter → Storyboard → Sync → Assembler"
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class GenerateScriptRequest(BaseModel):
    topic: str = Field(..., description="Subject of the educational video")
    context: Optional[str] = Field(None, description="Additional context or constraints")
    duration_seconds: int = Field(60, ge=10, le=300, description="Target video length in seconds")
    style: str = Field("educational", description="educational | explainer | tutorial")


class GenerateMeta(BaseModel):
    model_used: str
    fallback_triggered: bool
    generation_time_ms: int
    agents_used: list[str]
    pipeline_mode: str
    trace_url: Optional[str] = None  # Langfuse trace URL (None when tracing is off)


class GenerateScriptResponse(BaseModel):
    script: dict[str, Any]
    meta: GenerateMeta


class ComponentInfo(BaseModel):
    name: str
    description: str


class ComponentListResponse(BaseModel):
    components: list[ComponentInfo]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_PIPELINE_AGENTS = ["Director", "Scriptwriter", "Storyboard", "Sync", "Assembler"]

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.on_event("shutdown")
def on_shutdown():
    """Flush any pending Langfuse events before the process exits."""
    flush_langfuse()


@app.get("/health")
def health():
    """Quick liveness check. Returns pipeline mode, agent list, and tracing status."""
    return {
        "status": "ok",
        "pipeline": "langgraph",
        "agents": _PIPELINE_AGENTS,
        "models": {"primary": GROQ_MODEL, "fallback": GROQ_FALLBACK_MODEL},
        "skills_loaded": bool(REMOTION_KNOWLEDGE),
        "tracing": "langfuse" if tracing_enabled() else "disabled",
    }


@app.get("/api/skills")
def get_skills():
    """
    Return the Remotion best-practice knowledge injected into the assembler.
    The assembler_node reads this via the get_remotion_skill LangGraph tool.
    """
    return {
        "source": "skills/remotion-best-practices (timing, sequencing, transitions, compositions)",
        "knowledge": REMOTION_KNOWLEDGE,
        "injected_via": "get_remotion_skill tool → assembler_node system prompt",
    }


@app.get("/api/components", response_model=ComponentListResponse)
def list_components():
    """Return all available scene components from shared/componentCatalog.json."""
    catalog = get_catalog()
    return ComponentListResponse(
        components=[
            ComponentInfo(name=name, description=info.get("description", ""))
            for name, info in catalog.items()
        ]
    )


@app.get("/api/scripts")
def list_scripts():
    """List all previously generated scripts in shared/examples/."""
    paths = list_example_scripts()
    return {"scripts": [p.name for p in paths], "count": len(paths)}


@app.post("/api/generate-script", response_model=GenerateScriptResponse)
def generate_script(req: GenerateScriptRequest):
    """
    Generate a VideoScript JSON by firing the full LangGraph pipeline.

    Pipeline stages:
      1. Director     — palette, tone, scene structure, arc_type detection
      2. Scriptwriter — per-scene narration, key_points, code snippets
      3. Storyboard   — visual layout hints, element types, transition suggestions
      4. Sync         — frame-accurate duration_frames per scene at 30 fps
      5. Assembler    — maps all context → VideoScript JSON using componentCatalog

    The result is validated with Pydantic and saved to shared/examples/.
    """
    total_frames = req.duration_seconds * 30
    t0 = time.monotonic()

    initial_state: PipelineState = {
        "topic": req.topic,
        "duration_seconds": req.duration_seconds,
        "brief": None,
        "script": None,
        "story": None,
        "timing": None,
        "video_script": None,
        "errors": [],
        "model_used": None,
        "fallback_triggered": False,
    }

    session_id = slugify_topic(req.topic)

    logger.info("=" * 60)
    logger.info("🎬 [Pipeline] topic=%r  duration=%ds  style=%s  tracing=%s",
                req.topic, req.duration_seconds, req.style,
                "on" if tracing_enabled() else "off")
    logger.info("=" * 60)

    # ── Langfuse v4 tracing setup ─────────────────────────────────────────────
    # start_as_current_observation() is a context manager that creates a root
    # span and sets it as the current OTel span.  Any @observe-decorated
    # function called inside (e.g. chat_completion in api.py) automatically
    # becomes a child generation span — no callbacks needed.
    lf = get_langfuse()
    trace_url: Optional[str] = None

    def _run_pipeline() -> dict:
        return compiled_graph.invoke(initial_state)

    try:
        if lf:
            with lf.start_as_current_observation(
                name=f"video-pipeline:{req.topic}",
                input=req.model_dump(),
                metadata={
                    "topic": req.topic,
                    "duration_seconds": req.duration_seconds,
                    "style": req.style,
                    "session_id": session_id,
                },
            ):
                result = _run_pipeline()
                # Record output on the span before it closes
                lf.update_current_span(
                    output={
                        "scene_count": len((result.get("video_script") or {}).get("scenes", [])),
                        "model_used": result.get("model_used"),
                        "fallback_triggered": result.get("fallback_triggered", False),
                    }
                )
                trace_url = lf.get_trace_url()
        else:
            result = _run_pipeline()
    except Exception as exc:
        logger.error("LangGraph pipeline crashed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info("🏁 Pipeline finished in %.1fs", elapsed_ms / 1000)

    # Surface any agent errors
    if result.get("errors"):
        raise HTTPException(status_code=422, detail="; ".join(result["errors"]))

    script = result.get("video_script")
    if not script:
        raise HTTPException(status_code=422, detail="Pipeline produced no video_script")

    # Validate required top-level fields
    for field in ("title", "fps", "width", "height", "theme", "scenes"):
        if field not in script:
            raise HTTPException(
                status_code=422,
                detail=f"Assembler output missing required field: '{field}'",
            )

    # Last-resort frame-sum correction (Pydantic validation already ran inside assembler_node)
    actual_total = sum(s.get("duration_frames", 0) for s in script.get("scenes", []))
    if actual_total != total_frames:
        logger.warning("Frame sum %d ≠ expected %d — correcting last scene", actual_total, total_frames)
        scenes = script["scenes"]
        if scenes:
            scenes[-1]["duration_frames"] = max(30, scenes[-1]["duration_frames"] + (total_frames - actual_total))

    # Persist generated script to shared/examples/<slug>.json
    try:
        written_path = write_example_script(script, req.topic)
        logger.info("💾 Saved to %s", written_path)
    except Exception as exc:
        logger.warning("Could not write example script: %s", exc)

    if trace_url:
        logger.info("📊 Langfuse trace: %s", trace_url)
    if lf:
        lf.flush()

    return GenerateScriptResponse(
        script=script,
        meta=GenerateMeta(
            model_used=result.get("model_used") or "unknown",
            fallback_triggered=result.get("fallback_triggered", False),
            generation_time_ms=elapsed_ms,
            agents_used=_PIPELINE_AGENTS,
            pipeline_mode="langgraph",
            trace_url=trace_url,
        ),
    )
