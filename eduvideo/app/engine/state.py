"""LangGraph pipeline state. Reconciled with eduvideo's job-artifact model:
`job_id` replaces the reference's checkpoint_slug/force_restart; nodes resolve the
job dir from it. Agent branches write disjoint keys (scriptwriter→script,
visual_architect→story) so the parallel fan-in at merge is conflict-free."""

from __future__ import annotations

from typing import Any, Optional, TypedDict


class PipelineState(TypedDict, total=False):
    job_id: str
    topic: str
    context: Optional[str]
    duration_seconds: int
    fps: int
    width: int
    height: int
    enable_audio: bool
    audio_path: Optional[str]
    audio_url: Optional[str]
    syllabus: Optional[dict[str, Any]]       # researcher
    plan: Optional[dict[str, Any]]           # director
    script: Optional[dict[str, Any]]         # scriptwriter (parallel branch A)
    story: Optional[dict[str, Any]]          # visual_architect (parallel branch B)
    scenes: Optional[list[dict[str, Any]]]   # merge (+ real timing from voiceover)
    captions: Optional[list[dict[str, Any]]]
    video_script: Optional[dict[str, Any]]   # assembler → final VideoScript
    validation_report: Optional[dict[str, Any]]
    errors: list[str]
    model_used: Optional[str]
    fallback_triggered: bool
