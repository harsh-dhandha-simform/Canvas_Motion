"""Phase 7 end-of-phase test: run the full pipeline through Subtitles and confirm
subtitles.json is contiguous/within-bounds and scene_timings.json reconciles to the
real audio duration while covering every storyboard scene.

Run with: uv run python tests/test_phase7_subtitles.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.input import JobInput
from app.schemas.scene_timings import SceneTimings
from app.schemas.storyboard import Storyboard
from app.schemas.subtitles import Subtitles
from app.schemas.timings import Timings

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(
        JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90, includeQuiz=True)
    )
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="subtitles")
    print(f"job_id={job_id}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")

    timings = read_artifact(job_dir, "timings", Timings)
    subtitles = read_artifact(job_dir, "subtitles", Subtitles)
    storyboard = read_artifact(job_dir, "storyboard", Storyboard)
    scene_timings = read_artifact(job_dir, "scene_timings", SceneTimings)

    # --- subtitles.json: ordered, contiguous, within [0, durationSec] ---
    assert subtitles.items, "no subtitles produced"
    assert abs(subtitles.items[0].start - 0.0) < 0.01, f"first subtitle doesn't start at 0: {subtitles.items[0]}"
    for prev, nxt in zip(subtitles.items, subtitles.items[1:]):
        assert prev.start <= nxt.start, f"subtitles out of order: {prev} -> {nxt}"
        assert abs(nxt.start - prev.end) < 0.01, f"gap/overlap between subtitles: {prev} -> {nxt}"
    assert abs(subtitles.items[-1].end - timings.durationSec) < 0.01, (
        f"last subtitle end ({subtitles.items[-1].end}) != audio durationSec ({timings.durationSec})"
    )
    for s in subtitles.items:
        assert 0.0 <= s.start <= timings.durationSec and 0.0 <= s.end <= timings.durationSec, f"out of bounds: {s}"

    highlighted = [s for s in subtitles.items if s.highlight]

    # --- scene_timings.json: covers every storyboard scene, sums to audio duration ---
    assert [st.id for st in scene_timings.scenes] == [sc.id for sc in storyboard.scenes], (
        "scene_timings doesn't cover exactly the storyboard scenes, in order"
    )
    assert abs(scene_timings.totalDurationSec - timings.durationSec) < 0.5, (
        f"scene_timings total ({scene_timings.totalDurationSec}) != audio duration ({timings.durationSec})"
    )
    total_scene_duration = sum(st.duration for st in scene_timings.scenes)
    assert abs(total_scene_duration - timings.durationSec) < 0.5, (
        f"sum(scene durations)={total_scene_duration} != audio duration={timings.durationSec}"
    )
    # scene start times contiguous
    cursor = 0.0
    for st in scene_timings.scenes:
        assert abs(st.start - cursor) < 0.01, f"scene {st.id} start {st.start} != expected {cursor}"
        cursor += st.duration

    print(f"\nsubtitles: {len(subtitles.items)} lines, {len(highlighted)} with highlights, spans [0, {timings.durationSec}]")
    print("sample lines:")
    for s in subtitles.items[:6]:
        print(f"  [{s.start:>6.2f} - {s.end:>6.2f}] highlight={s.highlight} {s.text!r}")

    print(f"\nscene_timings: {len(scene_timings.scenes)} scenes, total={scene_timings.totalDurationSec}s (audio={timings.durationSec}s)")
    for st, sc in zip(scene_timings.scenes, storyboard.scenes):
        print(f"  {st.id}: concept_id={st.concept_id} start={st.start:>6.2f} duration={st.duration:>5.2f} (estDuration was {sc.estDuration})")

    print("\nsubtitles contiguous/ordered/in-bounds: OK, scene_timings covers all scenes and sums to audio duration: OK")


if __name__ == "__main__":
    main()
