"""Phase 2 end-of-phase smoke test: schema validation + orchestrator dry run.

Run with: uv run python tests/test_phase2_smoke.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic import ValidationError

from app.jobs import create_job, job_dir_for, write_artifact
from app.orchestrator import run_pipeline
from app.schemas.content_analysis import Concept, ContentAnalysis
from app.schemas.enums import AnimationPreset, JobStatus, Template
from app.schemas.input import JobInput
from app.schemas.video_plan import AudioRef, PlanScene, VideoMeta, VideoPlan


def test_schema_examples() -> None:
    ContentAnalysis(
        topic="TCP handshake",
        learningObjective="Understand how TCP connections are established",
        keyPoints=["SYN", "SYN-ACK", "ACK"],
        keywords=["TCP", "handshake"],
        commonMisconceptions=["UDP also needs a handshake"],
        concepts=[Concept(id="c1", title="What is TCP?", order=1, description="...")],
    )

    good_scene = PlanScene(
        id="scene_001",
        concept_id="c1",
        template=Template.TITLE,
        start=0.0,
        duration=5.0,
        animation=AnimationPreset.FADE_IN,
        props={"title": "TCP Handshake", "subtitle": "How connections start"},
    )
    assert good_scene.props["title"] == "TCP Handshake"

    VideoPlan(
        video=VideoMeta(title="TCP Handshake", durationSec=5.0),
        audio=AudioRef(voiceoverFile="voiceover.mp3"),
        subtitles=[],
        scenes=[good_scene],
    )
    print("schema examples: OK")


def test_bad_plan_scene_rejected() -> None:
    try:
        PlanScene(
            id="scene_bad",
            concept_id="c1",
            template=Template.TITLE,
            start=0.0,
            duration=5.0,
            animation=AnimationPreset.FADE_IN,
            props={"diagramType": "flow", "nodes": [], "edges": []},  # wrong shape for TitleScene
        )
    except ValidationError:
        print("bad PlanScene (props != template) rejected: OK")
        return
    raise AssertionError("expected ValidationError for mismatched template/props")


def test_orchestrator_end_to_end() -> None:
    job_id = create_job(JobInput(topic="TCP handshake"))
    job_dir = job_dir_for(job_id)
    try:
        manifest = run_pipeline(job_id)
        assert manifest.status == JobStatus.COMPLETED, manifest.status
        for artifact in ("content_analysis.json", "script.json", "storyboard.json", "timings.json",
                         "subtitles.json", "scene_timings.json", "concepts.json", "video_plan.json",
                         "interactions.json", "rendered.mp4"):
            assert (job_dir / artifact).exists(), f"missing {artifact}"
        assert (job_dir / "player").is_dir()

        try:
            write_artifact(
                job_dir,
                "content_analysis",
                ContentAnalysis(
                    topic="x", learningObjective="x", keyPoints=[], keywords=[],
                    commonMisconceptions=[], concepts=[],
                ),
            )
        except FileExistsError:
            print("immutability enforced (rewrite without overwrite raises): OK")
        else:
            raise AssertionError("expected FileExistsError writing an existing artifact")

        print(f"orchestrator end-to-end: OK (job_id={job_id})")
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


if __name__ == "__main__":
    test_schema_examples()
    test_bad_plan_scene_rejected()
    test_orchestrator_end_to_end()
    print("Phase 2 smoke test: ALL PASSED")
