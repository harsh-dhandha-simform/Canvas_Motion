"""In-memory generation job registry.

The LangGraph pipeline takes minutes (more with TTS), so the frontend can't hold a
synchronous request open. `start_generation` runs the pipeline in a daemon thread and
exposes coarse per-stage progress + the final script via `get_job`, mirroring the
render job registry (render/jobs.py). Process-local; fine for single-process serving.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from typing import Any, Optional

from graph.pipeline import compiled_graph
from utils.checkpoint import checkpoint_slug, clear_checkpoints
from utils.file_output import write_example_script

logger = logging.getLogger(__name__)

_JOBS: dict[str, dict[str, Any]] = {}
_LOCK = threading.Lock()


def _set(job_id: str, **fields: Any) -> None:
    with _LOCK:
        if job_id in _JOBS:
            _JOBS[job_id].update(fields)


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    with _LOCK:
        job = _JOBS.get(job_id)
        return dict(job) if job else None


def _stage(state: dict) -> str:
    """Coarse, user-facing progress derived from which state keys are populated."""
    if state.get("video_script"):
        return "finalizing"
    if state.get("captions"):
        return "generating audio"
    if state.get("scenes"):
        return "reviewing"
    if state.get("script") or state.get("story"):
        return "writing scenes"
    if state.get("plan"):
        return "writing scenes"
    if state.get("syllabus"):
        return "planning"
    return "researching"


def _run(job_id: str, req: dict) -> None:
    _set(job_id, status="running", stage="researching", started_at=time.time())
    try:
        slug = checkpoint_slug(req["topic"], req["duration_seconds"])
        if req.get("force_restart"):
            clear_checkpoints(slug)

        initial_state = {
            "topic": req["topic"],
            "context": req.get("context"),
            "duration_seconds": req["duration_seconds"],
            "fps": req.get("fps", 30),
            "width": req.get("width", 1920),
            "height": req.get("height", 1080),
            "checkpoint_slug": slug,
            "force_restart": req.get("force_restart", False),
            "enable_audio": req.get("enable_audio", False),
            "audio_path": None,
            "audio_url": None,
            "syllabus": None, "plan": None, "script": None, "story": None,
            "scenes": None, "captions": None, "video_script": None,
            "validation_report": None, "errors": [],
            "model_used": None, "fallback_triggered": False,
        }

        # stream_mode="values" yields the full state after each step; the last one is
        # the final state (== invoke's result). Update the stage as it progresses.
        final_state = dict(initial_state)
        for snapshot in compiled_graph.stream(initial_state, stream_mode="values"):
            final_state = snapshot
            _set(job_id, stage=_stage(snapshot))

        if final_state.get("errors"):
            raise RuntimeError("; ".join(final_state["errors"]))
        script = final_state.get("video_script")
        if not script:
            raise RuntimeError("pipeline produced no video_script")

        try:
            write_example_script(script, req["topic"])
        except Exception as exc:  # persistence is best-effort
            logger.warning("[gen-job] %s could not persist script: %s", job_id, exc)

        _set(job_id, status="done", stage="done", finished_at=time.time(),
             script=script, slug=slug)

        # Optionally chain a background render (same as the sync endpoint's render flag).
        if req.get("render"):
            try:
                from render.jobs import start_render
                _set(job_id, render_job_id=start_render(slug, script))
            except Exception as exc:
                logger.warning("[gen-job] %s could not start render: %s", job_id, exc)

        logger.info("[gen-job] ✅ %s done (slug=%s)", job_id, slug)
    except Exception as exc:
        logger.error("[gen-job] ❌ %s failed: %s", job_id, exc, exc_info=True)
        _set(job_id, status="failed", stage="failed", finished_at=time.time(), error=str(exc))


def start_generation(req: dict) -> str:
    """Register a generation job and run the pipeline in a background thread. Returns id."""
    job_id = uuid.uuid4().hex[:12]
    with _LOCK:
        _JOBS[job_id] = {
            "id": job_id, "status": "queued", "stage": "queued",
            "script": None, "slug": None, "render_job_id": None,
            "error": None, "started_at": None, "finished_at": None,
        }
    threading.Thread(target=_run, args=(job_id, req), daemon=True).start()
    logger.info("[gen-job] queued %s topic=%r", job_id, req.get("topic"))
    return job_id
