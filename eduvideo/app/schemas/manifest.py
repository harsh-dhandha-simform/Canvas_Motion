"""job.json — the job manifest tracking pipeline progress. Unlike every other
artifact, the manifest is mutable: the orchestrator rewrites it before/after each
stage (see app/jobs.py:update_manifest).
"""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.enums import JobStatus


class JobManifest(BaseModel):
    job_id: str
    status: JobStatus
    stage: str | None = None
    created_at: str
    updated_at: str
    error: str | None = None
    stages_done: list[str] = []
