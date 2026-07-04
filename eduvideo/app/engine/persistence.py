"""Bridges LangGraph node outputs onto eduvideo's immutable job-artifact model
(replaces the reference's checkpoint dir). Each node caches on `cached(...)` and
writes once with `persist(...)`; on rerun, rerun.py deletes the downstream
artifacts so `persist` succeeds again while upstream nodes hit the cache."""

from __future__ import annotations

from app.jobs import job_dir_for, read_json_artifact, write_json_artifact


def cached(job_id: str, name: str) -> dict | None:
    return read_json_artifact(job_dir_for(job_id), name)


def persist(job_id: str, name: str, data: dict) -> None:
    write_json_artifact(job_dir_for(job_id), name, data)
