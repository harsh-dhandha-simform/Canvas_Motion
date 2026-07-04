"""Plain-script test (run: uv run python tests/test_timing.py)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.engine.timing import compute_timings


def main() -> None:
    scenes = [{"narration": "word " * 20, "panels": [{"type": "BulletList"}]} for _ in range(4)]
    out = compute_timings(scenes, total_seconds=60, fps=30)
    assert sum(s["duration_frames"] for s in out) == 60 * 30, "durations must sum to target frames"
    assert out[0]["start_frame"] == 0, "first scene starts at 0"
    assert out[1]["start_frame"] == out[0]["duration_frames"], "gapless start_frame"
    print("test_timing: PASS")


if __name__ == "__main__":
    main()
