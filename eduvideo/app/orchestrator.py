"""Runs the pipeline's 11 stages in order for a job. Each stage module exposes
`run(job_dir: Path) -> None`, reading whatever artifact(s) the previous stage(s)
wrote and writing exactly one new artifact of its own. Every stage is a stub until
its real phase lands (see MASTER_CONTEXT.md §10 for the phase map).
"""

from __future__ import annotations

from app.agents import (
    concept_spine,
    content_analysis,
    interaction_planner,
    script_writer,
    storyboarder,
    subtitle_builder,
    video_plan_builder,
    voiceover,
)
from app.clients.tracing import start_trace
from app.jobs import job_dir_for, update_manifest
from app.player import builder as player_builder
from app.render import adapter as render_adapter
from app.schemas.enums import JobStatus
from app.schemas.manifest import JobManifest
from app.validation import validator as validate_stage

STAGES = [
    ("content_analysis", content_analysis),
    ("script", script_writer),
    ("storyboard", storyboarder),
    ("voiceover", voiceover),
    ("subtitles", subtitle_builder),
    ("concept_spine", concept_spine),
    ("video_plan", video_plan_builder),
    ("interactions", interaction_planner),
    ("validate", validate_stage),
    ("render", render_adapter),
    ("player", player_builder),
]


STAGE_NAMES = [name for name, _ in STAGES]


def run_pipeline(job_id: str, up_to: str | None = None) -> JobManifest:
    start_trace(job_id)
    return run_pipeline_from(job_id, STAGE_NAMES[0], up_to=up_to)


def run_pipeline_from(job_id: str, from_stage: str, up_to: str | None = None) -> JobManifest:
    """Runs STAGES starting at `from_stage`, preserving stages_done for whatever ran
    before it. Callers that want to re-run a stage (see app/rerun.py) must delete
    that stage's own artifact(s) first — write_artifact's immutability check would
    otherwise reject it.
    """
    if from_stage not in STAGE_NAMES:
        raise ValueError(f"unknown stage '{from_stage}' (known stages: {STAGE_NAMES})")

    job_dir = job_dir_for(job_id)
    start_index = STAGE_NAMES.index(from_stage)
    # Clear any stale error from a previous failed attempt — otherwise a job that
    # fails once and later succeeds on rerun would show status=completed alongside
    # a leftover error message.
    manifest = update_manifest(
        job_dir, status=JobStatus.RUNNING, stages_done=STAGE_NAMES[:start_index], error=None
    )

    for stage_name, stage in STAGES[start_index:]:
        update_manifest(job_dir, stage=stage_name)
        try:
            stage.run(job_dir)
        except Exception as exc:
            update_manifest(job_dir, status=JobStatus.FAILED, error=str(exc))
            raise
        manifest = update_manifest(job_dir, stages_done=[*manifest.stages_done, stage_name])
        if stage_name == up_to:
            return update_manifest(job_dir, status=JobStatus.COMPLETED, stage=None)

    return update_manifest(job_dir, status=JobStatus.COMPLETED, stage=None)
