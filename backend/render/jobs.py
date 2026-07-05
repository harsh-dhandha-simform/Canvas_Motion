"""In-memory render job registry.

Rendering takes minutes and there is no DB/queue in this backend, so a render runs
in a daemon thread and its status lives in a process-local dict. Good enough for
single-process testing; a durable queue would be a follow-up.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from typing import Any, Optional

from . import adapter

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


def _run(job_id: str, slug: str, video_script: dict) -> None:
    _set(job_id, status="rendering", started_at=time.time())
    try:
        output_path = adapter.run(video_script, slug)
        _set(
            job_id,
            status="done",
            finished_at=time.time(),
            output_url=f"/renders/{output_path.name}",
        )
        logger.info("[render-job] ✅ %s (slug=%s) done", job_id, slug)
    except Exception as exc:  # noqa: BLE001 — surface any failure to the job status
        logger.error("[render-job] ❌ %s (slug=%s) failed: %s", job_id, slug, exc)
        _set(job_id, status="failed", finished_at=time.time(), error=str(exc))


def start_render(slug: str, video_script: dict) -> str:
    """Register a job and start rendering in a background daemon thread. Returns id."""
    job_id = uuid.uuid4().hex[:12]
    with _LOCK:
        _JOBS[job_id] = {
            "id": job_id,
            "slug": slug,
            "status": "queued",
            "output_url": None,
            "error": None,
            "started_at": None,
            "finished_at": None,
        }
    threading.Thread(target=_run, args=(job_id, slug, video_script), daemon=True).start()
    logger.info("[render-job] queued %s for slug=%s", job_id, slug)
    return job_id
