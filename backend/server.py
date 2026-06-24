"""
backend/server.py — FastAPI HTTP server for JSON video script generation.

Separate from the existing LangGraph CLI pipeline (main.py).
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

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, INTER_AGENT_DELAY_SECONDS
from utils.api import get_client

# Agent modules — the same agents used by the LangGraph CLI pipeline (main.py).
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

_SKILLS_DIR = _BACKEND_DIR.parent / ".agents" / "skills" / "remotion-best-practices" / "rules"


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
            content = content[end + 3:].strip()
    return content


def _build_remotion_knowledge() -> str:
    """
    Distil Remotion best-practice knowledge from the skills library into a
    compact, actionable reference block for the LLM system prompt.

    Reads: timing.md, sequencing.md, transitions.md, compositions.md
    Extracts only the rules that matter when authoring a JSON video script.
    """
    # Load raw skill content (used below for inline citation)
    _load_skill("timing.md")        # noqa: confirms file exists
    _load_skill("sequencing.md")    # noqa
    _load_skill("transitions.md")   # noqa
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
logger.info("Loaded Remotion best-practice knowledge block (%d chars)", len(REMOTION_KNOWLEDGE))

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

# ---------------------------------------------------------------------------
# Component metadata — hardcoded for now, structured for future dynamic use
# ---------------------------------------------------------------------------

class ComponentMeta:
    def __init__(self, name: str, description: str, props: dict[str, Any]):
        self.name = name
        self.description = description
        self.props = props


COMPONENTS: list[ComponentMeta] = [
    ComponentMeta(
        name="AnimatedTitle",
        description=(
            "A full-screen animated title card with a large heading and optional subtitle. "
            "Use for intro, section breaks, key concept reveals, and conclusions. "
            "Animates in with a slide-up bezier and draws an accent underline beneath the title."
        ),
        props={
            "title": "string (required) — the main heading text",
            "subtitle": "string (optional) — smaller text displayed above the title",
            "accentColor": "string (optional) — hex color for the subtitle, accent dot, and underline. Defaults to #38BDF8",
            "align": '"center" | "left" (optional) — text alignment. Defaults to "center"',
        },
    ),
    ComponentMeta(
        name="ComparisonCard",
        description=(
            "A 500×550px comparison card showing pros (Advantages) and cons (Limitations) "
            "with staggered list reveal. Use for trade-off analysis, before/after comparisons, "
            "feature comparisons, or any scene that needs a structured two-column list. "
            "Best used when the scene focuses on a single concept being evaluated."
        ),
        props={
            "title": "string (required) — the card heading",
            "pros": "string[] (required) — list of advantages/positives (2–5 items)",
            "cons": "string[] (required) — list of limitations/negatives (2–5 items)",
            "accentColor": "string (optional) — hex color for the title dot and border glow. Defaults to #38BDF8",
            "visibleCount": "number (optional) — how many items to show; used for staggered reveal. Defaults to 99 (show all)",
        },
    ),
]


def build_system_prompt(components: list[ComponentMeta], remotion_knowledge: str = "") -> str:
    """
    Build the Groq system prompt by describing all available components.

    Accepts an optional `remotion_knowledge` block (sourced from the
    skills/remotion-best-practices library at startup) that teaches the LLM
    Remotion-specific timing, sequencing, and transition rules so it can make
    informed decisions when choosing duration_frames and transition values.

    Structured as a function so that in the future the component list can be
    sourced dynamically (e.g. auto-parsed from frontend/src/components/).
    For now the list is hardcoded in COMPONENTS above.
    """
    component_docs = "\n\n".join(
        f'### {c.name}\n{c.description}\n\nProps:\n'
        + "\n".join(f'  - `{k}`: {v}' for k, v in c.props.items())
        for c in components
    )

    knowledge_section = f"\n\n{remotion_knowledge.strip()}" if remotion_knowledge.strip() else ""

    return f"""You are a world-class educational video script writer specialized in producing
structured JSON video scripts for the Remotion animation framework.

Your ONLY output is a raw JSON object. No markdown, no backticks, no explanations, no preamble.
{knowledge_section}

## AVAILABLE SCENE COMPONENTS

The following components are the ONLY valid values for a scene's "type" field.
Each scene's "data" object must EXACTLY match the listed props for that component.

{component_docs}

## JSON STRUCTURE

Output a single JSON object with this exact structure:

{{
  "title": "string — the video title",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "theme": {{
    "primary": "#hex — main accent color",
    "secondary": "#hex — complementary accent",
    "accent": "#hex — highlight color",
    "background": "#hex — dark background (e.g. #0a0e1a)",
    "font": "string — Google Font name (e.g. Inter)"
  }},
  "scenes": [
    {{
      "id": "scene-1",
      "type": "ExactComponentName",
      "duration_frames": 90,
      "transition": "fade | slideLeft | slideUp | zoom | none",
      "data": {{ /* must match the component's props exactly */ }}
    }}
  ]
}}

## RULES

1. `type` must be one of: {", ".join(repr(c.name) for c in components)}. No other values.
2. `data` must contain ONLY the props listed for the chosen component. No extra fields.
3. `fps` is always 30. `width` is always 1920. `height` is always 1080.
4. The sum of all `duration_frames` MUST equal EXACTLY `duration_seconds × 30`. Transitions are overlays inside each scene's own frames — they do NOT reduce this sum.
5. Apply the minimum frame budgets from the Remotion reference above. Never go below the minimums.
6. Follow the sequencing pattern: AnimatedTitle intro → alternating types → AnimatedTitle outro with transition "none".
7. Choose a coherent `theme` (colors, font) that fits the topic's mood and domain.
8. Use dark backgrounds (near-black). Primary/secondary should be vibrant accent colors.
9. For `align` in AnimatedTitle: use "center" for intro/outro cards, "left" for mid-video section headers.
10. For ComparisonCard: ensure `pros` and `cons` each have 2–5 items, concise (≤10 words each).
11. Return ONLY the raw JSON object. No markdown. No backticks. No explanations.
""".strip()


SYSTEM_PROMPT = build_system_prompt(COMPONENTS, REMOTION_KNOWLEDGE)

# ---------------------------------------------------------------------------
# LLM caller with primary → fallback tracking
# ---------------------------------------------------------------------------

_PRIMARY_MODEL = "openai/gpt-oss-120b"
_FALLBACK_MODEL = "compound-beta"

_MODEL_CHAIN = [
    "openai/gpt-oss-120b",
    "compound-beta",
    "llama-3.3-70b-versatile",
]


def call_llm(prompt: str, system_prompt: str) -> tuple[str, str, bool]:
    """
    Send a chat completion request, trying the primary model first and falling
    back to the fallback model on any exception.

    Returns:
        (content, model_used, fallback_triggered)
    """
    import random
    import re
    from groq import APIStatusError

    client = get_client()
    last_error: Exception | None = None
    fallback_triggered = False

    for i, model in enumerate(_MODEL_CHAIN):
        if i > 0:
            fallback_triggered = True

        try:
            logger.info("[call_llm] Trying model: %s", model)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=4096,
            )
            content: str = response.choices[0].message.content or ""
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

            if not content.strip():
                last_error = RuntimeError(f"Empty response from {model}")
                continue

            logger.info("[call_llm] ✅ Success with model: %s", model)
            return content, model, fallback_triggered

        except Exception as exc:
            last_error = exc
            logger.warning("[call_llm] ⚠️ Model %s failed: %s", model, exc)
            continue

    raise HTTPException(
        status_code=503,
        detail=f"All LLM models failed. Last error: {last_error}",
    )


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class GenerateScriptRequest(BaseModel):
    topic: str = Field(..., description="The subject of the educational video")
    context: Optional[str] = Field(None, description="Additional context or constraints")
    duration_seconds: int = Field(60, ge=10, le=300, description="Target video length in seconds")
    style: str = Field("educational", description="educational | explainer | tutorial")


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


# ---------------------------------------------------------------------------
# Multi-agent pipeline helpers
# ---------------------------------------------------------------------------

_AGENT_SEQUENCE = ["Director", "Scriptwriter", "Storyboard", "Sync", "Assembler"]


def _pace() -> None:
    """Sleep between agent calls to respect Groq RPM limits."""
    logger.info("   ⏳ Rate-limit pause (%.1fs)…", INTER_AGENT_DELAY_SECONDS)
    time.sleep(INTER_AGENT_DELAY_SECONDS)


def _assemble_video_script(
    brief: dict,
    script: dict,
    story: dict,
    timing: dict,
    req: "GenerateScriptRequest",
) -> tuple[str, str, bool]:
    """
    Final LLM call: maps the 4-agent pipeline output to VideoScript JSON.

    The duration_frames produced by the Sync agent are passed to the LLM as
    FIXED values — it must copy them verbatim.  The LLM's only job here is
    to choose the right scene type (AnimatedTitle / ComparisonCard) and
    populate the data fields from the script content.
    """
    palette = brief.get("palette", {})
    typo = brief.get("typography", {})

    # Build a compact per-scene block: title, key_points, FIXED frame count
    scene_rows: list[str] = []
    for i, (s_script, s_timing) in enumerate(
        zip(script.get("scenes", []), timing.get("scenes", []))
    ):
        scene_rows.append(
            f"  [{i+1}] title={s_script.get('title')!r} | "
            f"duration_frames={s_timing.get('duration_frames')} (FIXED — do not change) | "
            f"key_points={s_script.get('key_points', [])}"
        )

    total_frames = sum(s.get("duration_frames", 0) for s in timing.get("scenes", []))

    assembler_prompt = (
        f"Convert this multi-agent pipeline output to a VideoScript JSON.\n"
        f"Topic: {req.topic!r}\n\n"
        f"SCENE PLAN — duration_frames values are EXACT, copy them unchanged:\n"
        + "\n".join(scene_rows)
        + f"\n\nTheme — use these EXACT hex values:\n"
        f'  background="{palette.get("background", "#0b0f1e")}"  '
        f'primary="{palette.get("primary", "#7c3aed")}"  '
        f'secondary="{palette.get("secondary", "#f59e0b")}"  '
        f'accent="{palette.get("highlight", "#34d399")}"  '
        f'font="{typo.get("heading_font", "Inter")}"\n\n'
        f"Total frames = {total_frames} (sum of all duration_frames must equal this exactly).\n"
        f"Scene 1 and the last scene must be AnimatedTitle.\n"
        f"Use ComparisonCard for trade-off or comparison scenes — split key_points into "
        f"pros (first half) and cons (second half).\n"
        f"Use AnimatedTitle for concept-introduction and narrative scenes.\n"
        f"Alternate types where possible. Last scene transition must be 'none'."
    )

    return call_llm(assembler_prompt, SYSTEM_PROMPT)


def _run_agent_pipeline(req: "GenerateScriptRequest") -> tuple[dict, str, bool]:
    """
    Fire all 4 specialist agents then call the LLM assembler.

    Director  → Scriptwriter → Storyboard → Sync → Assembler
       ↓              ↓             ↓           ↓         ↓
    brief         script         story       timing    VideoScript JSON

    Returns (script_dict, assembler_model_used, fallback_triggered).
    """
    total_frames = req.duration_seconds * 30

    # ── Step 1 / 5: Director ────────────────────────────────────────────────
    logger.info("── [Pipeline 1/5] Director — planning topic: %r", req.topic)
    brief = _director.run_agent(req.topic)
    # Override total_seconds with the caller's explicit request (Director
    # defaults to 90–150 s; the HTTP caller may ask for something different).
    brief["total_seconds"] = req.duration_seconds
    brief["scene_count"] = max(4, min(12, req.duration_seconds // 12))
    _pace()

    # ── Step 2 / 5: Scriptwriter ─────────────────────────────────────────────
    logger.info("── [Pipeline 2/5] Scriptwriter — writing scene narrations")
    script = _scriptwriter.run_agent(brief)
    _pace()

    # ── Step 3 / 5: Storyboard ───────────────────────────────────────────────
    logger.info("── [Pipeline 3/5] Storyboard — designing visual layouts")
    story = _storyboard.run_agent(brief, script)
    _pace()

    # ── Step 4 / 5: Sync Specialist ──────────────────────────────────────────
    logger.info("── [Pipeline 4/5] Sync — computing frame-accurate timings")
    timing = _sync.run_agent(brief, script)
    _pace()

    # Guard: if Sync returned wrong total, rescale the last scene
    sync_total = sum(s.get("duration_frames", 0) for s in timing.get("scenes", []))
    if sync_total != total_frames:
        logger.warning(
            "[Pipeline] Sync frame total %d ≠ expected %d — adjusting last scene",
            sync_total, total_frames,
        )
        scenes = timing.get("scenes", [])
        if scenes:
            scenes[-1]["duration_frames"] = max(
                30, scenes[-1]["duration_frames"] + (total_frames - sync_total)
            )

    # ── Step 5 / 5: LLM Assembler ────────────────────────────────────────────
    logger.info("── [Pipeline 5/5] Assembler — converting to VideoScript JSON")
    raw, model_used, fallback = _assemble_video_script(brief, script, story, timing, req)
    script_dict = json.loads(_extract_json(raw))

    # Enforce theme from Director palette (LLM may drift on colors)
    palette = brief.get("palette", {})
    typo = brief.get("typography", {})
    script_dict["theme"] = {
        "primary":    palette.get("primary", "#7c3aed"),
        "secondary":  palette.get("secondary", "#f59e0b"),
        "accent":     palette.get("highlight", "#34d399"),
        "background": palette.get("background", "#0b0f1e"),
        "font":       typo.get("heading_font", "Inter"),
    }
    script_dict["fps"] = 30
    script_dict["width"] = 1920
    script_dict["height"] = 1080
    script_dict.setdefault("title", req.topic)

    return script_dict, model_used, fallback


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


@app.get("/api/components", response_model=ComponentListResponse)
def list_components():
    """
    Return the list of currently available scene component names and their props.
    Hardcoded for now; structured to be made dynamic in the future.
    """
    return ComponentListResponse(
        components=[
            ComponentInfo(name=c.name, description=c.description, props=c.props)
            for c in COMPONENTS
        ]
    )


@app.post("/api/generate-script", response_model=GenerateScriptResponse)
def generate_script(req: GenerateScriptRequest):
    """
    Generate a structured JSON video script by firing the full multi-agent pipeline:
      Director → Scriptwriter → Storyboard → Sync → LLM Assembler

    Each specialist agent contributes its expertise:
      - Director:     palette, tone, scene count, scene titles
      - Scriptwriter: per-scene narration, key_points
      - Storyboard:   visual layout hints for scene type selection
      - Sync:         frame-accurate duration_frames per scene
      - Assembler:    maps all context → VideoScript JSON (AnimatedTitle / ComparisonCard)
    """
    total_frames = req.duration_seconds * 30
    t0 = time.monotonic()

    try:
        script, model_used, fallback_triggered = _run_agent_pipeline(req)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.error("Pipeline failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))

    elapsed_ms = int((time.monotonic() - t0) * 1000)

    # Validate required top-level fields
    for field in ("title", "fps", "width", "height", "theme", "scenes"):
        if field not in script:
            raise HTTPException(
                status_code=422,
                detail=f"Assembler output missing required field: '{field}'",
            )

    # Validate scene types
    valid_types = {c.name for c in COMPONENTS}
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

    # Validate frame sum — last resort correction if Assembler drifted
    total = sum(s.get("duration_frames", 0) for s in script.get("scenes", []))
    if total != total_frames:
        logger.warning(
            "Assembler frame sum %d ≠ expected %d — correcting last scene",
            total, total_frames,
        )
        scenes = script["scenes"]
        if scenes:
            scenes[-1]["duration_frames"] = max(30, scenes[-1]["duration_frames"] + (total_frames - total))

    return GenerateScriptResponse(
        script=script,
        meta=GenerateMeta(
            model_used=model_used,
            fallback_triggered=fallback_triggered,
            generation_time_ms=elapsed_ms,
            agents_used=_AGENT_SEQUENCE,
            pipeline_mode="multi-agent",
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
