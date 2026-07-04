"""Re-run tooling (Phase 10, optional but recommended): re-runs the pipeline from a
given stage using the existing upstream artifacts, so revisions are cheap — you
don't have to redo the LLM calls (or the render) just to fix one downstream stage.

Deletes the on-disk artifact(s) for `--from` onward first, so those stages' own
write_artifact() calls succeed under the normal immutability rule (they'd otherwise
reject overwriting a file that already exists), then resumes run_pipeline_from().

Usage: uv run python -m app.rerun <job_id> --from <stage> [--up-to <stage>]
"""

from __future__ import annotations

import argparse
import shutil

from app.jobs import job_dir_for
from app.orchestrator import STAGE_NAMES, run_pipeline_from

_STAGE_ARTIFACTS: dict[str, list[str]] = {
    "content_analysis": ["content_analysis.json"],
    "script": ["script.json"],
    "storyboard": ["storyboard.json"],
    "voiceover": ["voiceover.mp3", "timings.json"],
    "subtitles": ["subtitles.json", "scene_timings.json"],
    "concept_spine": ["concepts.json"],
    "video_plan": ["video_plan.json"],
    "interactions": ["interactions.json"],
    "validate": ["validation_errors.json"],
    "render": ["rendered.mp4", "render.log"],
    "player": ["player"],
}


def main() -> None:
    from app.logging_config import setup_logging

    setup_logging()
    parser = argparse.ArgumentParser(description="Re-run the eduvideo pipeline from a given stage.")
    parser.add_argument("job_id")
    parser.add_argument("--from", dest="from_stage", required=True, choices=STAGE_NAMES)
    parser.add_argument("--up-to", dest="up_to", default=None, choices=STAGE_NAMES)
    args = parser.parse_args()

    job_dir = job_dir_for(args.job_id)
    if not job_dir.exists():
        raise SystemExit(f"no such job: {args.job_id}")

    start_index = STAGE_NAMES.index(args.from_stage)
    for stage_name in STAGE_NAMES[start_index:]:
        for artifact in _STAGE_ARTIFACTS.get(stage_name, []):
            path = job_dir / artifact
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            else:
                path.unlink(missing_ok=True)

    manifest = run_pipeline_from(args.job_id, args.from_stage, up_to=args.up_to)
    print(f"job {args.job_id}: status={manifest.status}, stages_done={manifest.stages_done}")


if __name__ == "__main__":
    main()
