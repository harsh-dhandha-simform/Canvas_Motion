"""Runs a job through the full pipeline: the LangGraph generation engine
(researcher → director → {scriptwriter ∥ visual_architect} → merge → validator →
voiceover → assembler) followed by the classic Python tail stages (concept_spine →
interactions → validate → render → player).

The graph runs in-memory; each of its nodes persists its output as an immutable job
artifact (via app/engine/persistence.py) so the manifest, rerun.py, and the player
keep working exactly as before. The tail stages each expose `run(job_dir) -> None`,
reading prior artifacts and writing exactly one new artifact of their own.

STAGE_NAMES is a valid topological order, so rerun.py --from <stage> can delete the
downstream closure and this module recomputes only what's needed (upstream graph
nodes hit their artifact cache; upstream tail stages are skipped).
"""

from __future__ import annotations

from loguru import logger

from app.agents import concept_spine, interaction_planner
from app.clients.tracing import start_trace
from app.config import get_settings
from app.engine.pipeline import compiled_graph
from app.engine.state import PipelineState
from app.jobs import job_dir_for, read_artifact, update_manifest
from app.player import builder as player_builder
from app.render import adapter as render_adapter
from app.schemas.enums import JobStatus
from app.schemas.input import JobInput
from app.schemas.manifest import JobManifest
from app.validation import validator as validate_stage

# The in-graph generation stages (each is a LangGraph node that persists one artifact).
GRAPH_STAGES = [
    "researcher",
    "director",
    "scriptwriter",
    "visual_architect",
    "merge",
    "validator",
    "voiceover",
    "assembler",
]

# The classic tail stages (each module.run(job_dir)), run after the graph completes.
TAIL_STAGES = [
    ("concept_spine", concept_spine),
    ("interactions", interaction_planner),
    ("validate", validate_stage),
    ("render", render_adapter),
    ("player", player_builder),
]

# Full topological order — used by rerun.py to compute the downstream closure.
STAGE_NAMES = GRAPH_STAGES + [name for name, _ in TAIL_STAGES]


def _initial_state(job_id: str) -> PipelineState:
    """Seeds the graph from the job's input.json + config. Audio is enabled only
    when Deepgram is configured; voiceover_node self-gates on this flag."""
    job_dir = job_dir_for(job_id)
    ji = read_artifact(job_dir, "input", JobInput)
    settings = get_settings()
    video = settings.config.video
    return {
        "job_id": job_id,
        "topic": ji.topic,
        "context": ji.context,
        "duration_seconds": ji.durationSec or video.default_duration_seconds,
        "fps": video.fps,
        "width": video.width,
        "height": video.height,
        "enable_audio": settings.deepgram_configured,
        "audio_path": None,
        "audio_url": None,
        "errors": [],
        "fallback_triggered": False,
    }


def run_pipeline(job_id: str, up_to: str | None = None) -> JobManifest:
    start_trace(job_id)
    return run_pipeline_from(job_id, STAGE_NAMES[0], up_to=up_to)


def run_pipeline_from(job_id: str, from_stage: str, up_to: str | None = None) -> JobManifest:
    """Runs the pipeline starting at `from_stage`, preserving stages_done for whatever
    ran before it. Callers re-running a stage (see app/rerun.py) must delete that
    stage's own artifact(s) first — the immutable writes would otherwise reject them.

    When `from_stage` is a graph stage, the whole graph is streamed: nodes upstream of
    `from_stage` return their cached artifact (no recompute, no re-persist), and only
    `from_stage` onward — whose artifacts rerun.py deleted — actually recompute. When
    `from_stage` is a tail stage, the graph is skipped entirely (all its artifacts are
    already present) and only the remaining tail stages run.
    """
    if from_stage not in STAGE_NAMES:
        raise ValueError(f"unknown stage '{from_stage}' (known stages: {STAGE_NAMES})")

    job_dir = job_dir_for(job_id)
    start_index = STAGE_NAMES.index(from_stage)
    # Pre-seed stages_done with everything before from_stage. Clear any stale error so
    # a job that failed once and later succeeds on rerun doesn't show a leftover error.
    done = list(STAGE_NAMES[:start_index])
    manifest = update_manifest(job_dir, status=JobStatus.RUNNING, stages_done=done, error=None)

    with logger.contextualize(job_id=job_id):
        try:
            # --- Graph portion (only if from_stage is within the graph) ---
            if start_index < len(GRAPH_STAGES):
                logger.info("Streaming generation graph from '{}'", from_stage)
                for update in compiled_graph.stream(_initial_state(job_id), stream_mode="updates"):
                    # A parallel super-step may yield >1 node in one dict; iterate.
                    for node_name in update:
                        if node_name in done:
                            # Upstream cache-hit re-run — already recorded.
                            continue
                        done.append(node_name)
                        manifest = update_manifest(job_dir, stage=node_name, stages_done=done)
                        logger.info("Stage complete: {}", node_name)
                        if node_name == up_to:
                            return update_manifest(job_dir, status=JobStatus.COMPLETED, stage=None)

            # --- Tail portion ---
            tail_start = max(0, start_index - len(GRAPH_STAGES))
            for stage_name, stage in TAIL_STAGES[tail_start:]:
                update_manifest(job_dir, stage=stage_name)
                logger.info("Running tail stage: {}", stage_name)
                stage.run(job_dir)
                done.append(stage_name)
                manifest = update_manifest(job_dir, stages_done=done)
                logger.info("Stage complete: {}", stage_name)
                if stage_name == up_to:
                    return update_manifest(job_dir, status=JobStatus.COMPLETED, stage=None)
        except Exception as exc:
            logger.exception("Pipeline failed at stage '{}'", manifest.stage)
            update_manifest(job_dir, status=JobStatus.FAILED, error=str(exc))
            raise

    return update_manifest(job_dir, status=JobStatus.COMPLETED, stage=None)
