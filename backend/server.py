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
import subprocess
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
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import GROQ_MODEL, GROQ_FALLBACK_MODEL, RENDER_DIR
from graph.pipeline import compiled_graph
from graph.state import PipelineState
from component_catalog import get_catalog
from utils.checkpoint import checkpoint_slug, clear_checkpoints, load_checkpoint
from utils.file_output import write_example_script, list_example_scripts, slugify_topic, EXAMPLES_DIR, GENERATED_DIR
from utils.tracing import get_langfuse, flush as flush_langfuse, is_enabled as tracing_enabled
from render.jobs import start_render, get_job
from graph.jobs import start_generation, get_job as get_generation_job

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("server")

# ---------------------------------------------------------------------------
# Helper: re-generate examples.generated.ts after every successful pipeline run
# so the Remotion studio HMR picks up new compositions without a manual restart.
# ---------------------------------------------------------------------------

_FRONTEND_DIR = _BACKEND_DIR.parent / "frontend"

def _regen_examples_ts() -> None:
    """Run `npm run register-examples` in the frontend directory."""
    try:
        result = subprocess.run(
            ["npm", "run", "register-examples"],
            cwd=str(_FRONTEND_DIR),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            logger.info("🔄 examples.generated.ts refreshed — Remotion HMR will pick up new composition")
        else:
            logger.warning("register-examples exited %d: %s", result.returncode, result.stderr[:300])
    except Exception as exc:
        logger.warning("Could not regenerate examples.generated.ts: %s", exc)


# ---------------------------------------------------------------------------
# Note: Remotion best-practice knowledge is no longer injected into agents.
# Agents only emit (component type + data); Remotion/animation expertise lives
# in the frontend components and in per-component `minSeconds` (timing).
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

# Mount audio folder so Remotion can fetch the TTS mp3s
audio_dir = _BACKEND_DIR / "audio"
audio_dir.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(audio_dir)), name="audio")

# Mount the renders folder so clients can download the rendered mp4s
RENDER_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=str(RENDER_DIR)), name="renders")

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class GenerateScriptRequest(BaseModel):
    topic: str = Field(..., description="Subject of the educational video")
    context: Optional[str] = Field(None, description="Additional context or constraints")
    duration_seconds: int = Field(60, ge=10, le=1800, description="Target video length in seconds (up to 30 min)")
    style: str = Field("educational", description="educational | explainer | tutorial")
    force_restart: bool = Field(False, description="Clear checkpoints and regenerate from scratch")
    enable_audio: bool = Field(False, description="Generate Deepgram TTS audio")
    render: bool = Field(False, description="Render the generated script to mp4 in the background")
    fps: int = Field(30, description="Frames per second")
    width: int = Field(1920, description="Canvas width")
    height: int = Field(1080, description="Canvas height")


class GenerateMeta(BaseModel):
    model_used: str
    fallback_triggered: bool
    generation_time_ms: int
    agents_used: list[str]
    pipeline_mode: str
    checkpoint_slug: str
    trace_url: Optional[str] = None  # Langfuse trace URL (None when tracing is off)
    render_job_id: Optional[str] = None  # set when render=true (poll GET /api/render/{id})


class GenerateScriptResponse(BaseModel):
    script: dict[str, Any]
    meta: GenerateMeta


class RenderRequest(BaseModel):
    slug: Optional[str] = Field(None, description="Slug of a generated/example script to render")
    topic: Optional[str] = Field(None, description="Topic (slugified to a slug) when slug is not given")


class ComponentInfo(BaseModel):
    name: str
    description: str


class ComponentListResponse(BaseModel):
    components: list[ComponentInfo]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_PIPELINE_AGENTS = ["Researcher", "Director", "Scriptwriter", "VisualArchitect", "Validator", "Assembler"]

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
        "tracing": "langfuse" if tracing_enabled() else "disabled",
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


@app.get("/api/checkpoints/{slug}")
def check_checkpoints(slug: str):
    """Return the status of checkpoints for a given slug."""
    stages = ["syllabus", "plan", "script", "story", "scenes", "validation_report", "video_script"]
    status = {}
    for stage in stages:
        data = load_checkpoint(slug, stage)
        status[stage] = data is not None
    return {"slug": slug, "checkpoints": status}


@app.post("/api/generate-script", response_model=GenerateScriptResponse)
def generate_script(req: GenerateScriptRequest):
    """
    Generate a VideoScript JSON by firing the full LangGraph pipeline.

    Pipeline stages:
      1. Director     — palette, tone, scene structure
      2. Scriptwriter — per-scene narration, key_points, code snippets
      3. Storyboard   — visual layout hints, element types, transition suggestions
      4. Sync         — frame-accurate duration_frames per scene at 30 fps
      5. Assembler    — maps all context → VideoScript JSON using componentCatalog

    The result is validated with Pydantic and saved to shared/examples/.
    """
    t0 = time.monotonic()

    slug = checkpoint_slug(req.topic, req.duration_seconds)
    if req.force_restart:
        clear_checkpoints(slug)

    initial_state: PipelineState = {
        "topic": req.topic,
        "context": req.context,
        "duration_seconds": req.duration_seconds,
        "fps": req.fps,
        "width": req.width,
        "height": req.height,
        "checkpoint_slug": slug,
        "force_restart": req.force_restart,
        "enable_audio": req.enable_audio,
        "audio_path": None,
        "audio_url": None,
        "syllabus": None,
        "plan": None,
        "script": None,
        "story": None,
        "scenes": None,
        "captions": None,
        "video_script": None,
        "validation_report": None,
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

    # (Frame-sum correction hack removed to let natural narration-driven timing win)

    # Persist generated script to shared/examples/<slug>.json
    try:
        written_path = write_example_script(script, req.topic)
        logger.info("💾 Saved to %s", written_path)
        # Re-run register-examples so the Remotion studio picks up the new composition via HMR
        _regen_examples_ts()
    except Exception as exc:
        logger.warning("Could not write example script: %s", exc)

    # Optionally kick off a background render of the just-generated script.
    render_job_id: Optional[str] = None
    if req.render:
        try:
            render_job_id = start_render(slugify_topic(req.topic), script)
        except Exception as exc:
            logger.warning("Could not start render: %s", exc)

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
            checkpoint_slug=slug,
            trace_url=trace_url,
            render_job_id=render_job_id,
        ),
    )


# ---------------------------------------------------------------------------
# Render routes
# ---------------------------------------------------------------------------

def _resolve_script(slug: str) -> Optional[dict[str, Any]]:
    """Load a generated (or example) VideoScript JSON by slug, or None if absent."""
    for d in (GENERATED_DIR, EXAMPLES_DIR):
        p = d / f"{slug}.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return None


@app.post("/api/render")
def start_render_endpoint(req: RenderRequest):
    """Render a previously generated (or example) script to mp4 in the background."""
    slug = req.slug or (slugify_topic(req.topic) if req.topic else None)
    if not slug:
        raise HTTPException(status_code=400, detail="Provide 'slug' or 'topic'")
    script = _resolve_script(slug)
    if script is None:
        raise HTTPException(status_code=404, detail=f"No script found for slug '{slug}'")
    job_id = start_render(slug, script)
    return {"job_id": job_id, "slug": slug, "status": "queued"}


@app.get("/api/render/{job_id}")
def render_status(job_id: str):
    """Poll a render job's status; output_url is set once status == 'done'."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"No render job '{job_id}'")
    return job


# ---------------------------------------------------------------------------
# Async script generation (frontend-friendly: POST once, then poll)
# ---------------------------------------------------------------------------

@app.post("/api/generate-script/async")
def generate_script_async(req: GenerateScriptRequest):
    """Start the generation pipeline in the background. Poll
    GET /api/generate-script/status/{job_id} for progress + the final script."""
    job_id = start_generation(req.model_dump())
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/generate-script/status/{job_id}")
def generate_script_status(job_id: str):
    """Poll a generation job. When status == 'done', `script` holds the VideoScript
    (and `render_job_id` is set when render was requested)."""
    job = get_generation_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"No generation job '{job_id}'")
    return job
