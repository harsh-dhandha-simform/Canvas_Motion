"""Per-job folder helpers: create job folders, and read/write the Pydantic artifacts
that live inside them. Artifacts are immutable by default (each pipeline stage writes
exactly one new file, never overwrites an earlier one) — `job.json` is the one
exception, since the orchestrator rewrites it continuously as stages run.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from app.config import BASE_DIR, get_settings
from app.schemas.enums import JobStatus
from app.schemas.input import JobInput
from app.schemas.manifest import JobManifest

ModelT = TypeVar("ModelT", bound=BaseModel)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def jobs_root() -> Path:
    root = BASE_DIR / get_settings().config.jobs.dir
    root.mkdir(parents=True, exist_ok=True)
    return root


def job_dir_for(job_id: str) -> Path:
    return jobs_root() / job_id


def _artifact_path(job_dir: Path, name: str) -> Path:
    return job_dir / f"{name}.json"


def write_artifact(job_dir: Path, name: str, model: BaseModel, overwrite: bool = False) -> Path:
    path = _artifact_path(job_dir, name)
    if path.exists() and not overwrite:
        raise FileExistsError(f"artifact '{name}' already exists at {path} (pipeline stages are immutable)")
    path.write_text(model.model_dump_json(indent=2, by_alias=True), encoding="utf-8")
    return path


def read_artifact(job_dir: Path, name: str, model_cls: type[ModelT]) -> ModelT:
    data = json.loads(_artifact_path(job_dir, name).read_text(encoding="utf-8"))
    return model_cls.model_validate(data)


def write_json_artifact(job_dir: Path, name: str, data: dict, overwrite: bool = False) -> Path:
    """Immutable raw-dict artifact write (the LangGraph engine nodes deal in plain
    dicts, not Pydantic models). Same immutability rule as write_artifact."""
    path = _artifact_path(job_dir, name)
    if path.exists() and not overwrite:
        raise FileExistsError(f"artifact '{name}' already exists at {path} (pipeline stages are immutable)")
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


def read_json_artifact(job_dir: Path, name: str) -> dict | None:
    path = _artifact_path(job_dir, name)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def read_manifest(job_dir: Path) -> JobManifest:
    return read_artifact(job_dir, "job", JobManifest)


def update_manifest(job_dir: Path, **changes: object) -> JobManifest:
    updated = read_manifest(job_dir).model_copy(update={**changes, "updated_at": _now()})
    write_artifact(job_dir, "job", updated, overwrite=True)
    return updated


def create_job(job_input: JobInput) -> str:
    job_id = uuid.uuid4().hex
    job_dir = job_dir_for(job_id)
    job_dir.mkdir(parents=True)

    write_artifact(job_dir, "input", job_input)
    write_artifact(
        job_dir,
        "job",
        JobManifest(
            job_id=job_id,
            status=JobStatus.QUEUED,
            stage=None,
            created_at=_now(),
            updated_at=_now(),
            stages_done=[],
        ),
    )
    return job_id
