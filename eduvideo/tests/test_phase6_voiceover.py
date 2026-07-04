"""Phase 6 end-of-phase test: run the full pipeline through Voiceover and confirm
voiceover.mp3 is playable and timings.json covers the full audio contiguously.

Run with: uv run python tests/test_phase6_voiceover.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.input import JobInput
from app.schemas.timings import Timings

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(
        JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90, includeQuiz=True)
    )
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="voiceover")
    print(f"job_id={job_id}")
    print(f"job_dir={job_dir}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")

    audio_path = job_dir / "voiceover.mp3"
    assert audio_path.exists(), "voiceover.mp3 was not written"
    audio_size = audio_path.stat().st_size
    assert audio_size > 0, "voiceover.mp3 is empty"

    timings = read_artifact(job_dir, "timings", Timings)
    assert timings.audioFile == "voiceover.mp3"
    assert timings.durationSec > 0, "durationSec must be > 0"
    assert timings.segments, "no segments produced"

    # segments must be contiguous, covering [0, durationSec], no gaps/overlaps
    assert abs(timings.segments[0].start - 0.0) < 0.01, f"first segment doesn't start at 0: {timings.segments[0]}"
    for prev, nxt in zip(timings.segments, timings.segments[1:]):
        assert abs(nxt.start - prev.end) < 0.01, f"gap/overlap between segments: {prev} -> {nxt}"
    assert abs(timings.segments[-1].end - timings.durationSec) < 0.01, (
        f"last segment end ({timings.segments[-1].end}) != durationSec ({timings.durationSec})"
    )

    any_estimated = any(s.estimated for s in timings.segments)
    all_estimated = all(s.estimated for s in timings.segments)

    print(f"\nvoiceover.mp3: {audio_size} bytes")
    print(f"timings.json: durationSec={timings.durationSec}, segments={len(timings.segments)}")
    print(f"timings estimated: {'ALL estimated (proportional fallback)' if all_estimated else 'some real' if any_estimated else 'ALL real (Deepgram-provided)'}")
    print("\nsegments:")
    for s in timings.segments:
        print(f"  [{s.start:>6.2f} - {s.end:>6.2f}] estimated={s.estimated} {s.text[:70]!r}")

    print("\naudio non-empty: OK, segments contiguous [0, durationSec]: OK")


if __name__ == "__main__":
    main()
