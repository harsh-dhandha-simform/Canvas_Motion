"""FastAPI entrypoint (thin). Background job execution uses a plain daemon thread
for v1 — no external queue (MASTER_CONTEXT.md §10 Phase 10 guardrail).
"""

from __future__ import annotations

import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.clients.llm import LLMClient
from app.clients.tts import TTSClient
from app.config import get_settings
from app.jobs import create_job, job_dir_for, read_manifest
from app.orchestrator import run_pipeline
from app.schemas.input import JobInput
from app.schemas.manifest import JobManifest

app = FastAPI(title="EduVideo")

# The player is built ONCE (player/dist) and loads any job by id at runtime via
# ?job=<id> — see app/player/builder.py for why we don't bundle per job. Missing
# dist just means the player hasn't been built yet (npm install && npm run build
# in player/); the API still serves everything else.
_PLAYER_DIST = Path(__file__).resolve().parent.parent / "player" / "dist"
if _PLAYER_DIST.is_dir():
    app.mount("/player", StaticFiles(directory=str(_PLAYER_DIST), html=True), name="player")


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "llm": LLMClient().health(),
        "tts": TTSClient().health(),
        "langfuse": {"enabled": settings.langfuse_enabled},
    }


@app.post("/jobs")
def create_job_endpoint(job_input: JobInput) -> dict:
    """Creates a job and runs the full pipeline (through `player`) in the background."""
    job_id = create_job(job_input)
    threading.Thread(target=run_pipeline, args=(job_id,), daemon=True).start()
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> JobManifest:
    job_dir = job_dir_for(job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="job not found")
    return read_manifest(job_dir)


@app.get("/jobs/{job_id}/video")
def get_job_video(job_id: str) -> FileResponse:
    job_dir = job_dir_for(job_id)
    video_path = job_dir / "rendered.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="video not ready")
    return FileResponse(video_path, media_type="video/mp4", filename="rendered.mp4")


@app.get("/jobs/{job_id}/module.json")
def get_job_module(job_id: str) -> FileResponse:
    """The small manifest the player fetches at runtime (video URL + concepts +
    interactions), written by the `player` stage (app/player/builder.py)."""
    module_path = job_dir_for(job_id) / "player" / "module.json"
    if not module_path.exists():
        raise HTTPException(status_code=404, detail="module not ready")
    return FileResponse(module_path, media_type="application/json")


@app.get("/jobs/{job_id}/player")
def get_job_player(job_id: str) -> RedirectResponse:
    """Convenience redirect to the shared player app, preloaded with this job."""
    if not _PLAYER_DIST.is_dir():
        raise HTTPException(status_code=503, detail="player not built — run npm install && npm run build in player/")
    return RedirectResponse(url=f"/player/?job={job_id}")
