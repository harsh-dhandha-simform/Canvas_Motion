"""Plain-script test (run: uv run python tests/test_voiceover_node.py). Requires DEEPGRAM.
Verifies voiceover_node produces real audio, real per-scene durations (gapless
start_frame), and keyword-highlight captions."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.engine.nodes as nodes
import app.engine.persistence as persistence
import app.jobs as jobs


def main() -> None:
    scenes = [
        {"id": "scene-1", "narration": "A cache stores data close to the client for speed.",
         "duration_frames": 90, "start_frame": 0, "panels": []},
        {"id": "scene-2", "narration": "The server responds when the cache misses the lookup.",
         "duration_frames": 90, "start_frame": 90, "panels": []},
        {"id": "scene-3", "narration": "", "duration_frames": 60, "start_frame": 180, "panels": []},
    ]
    syllabus = {"key_terms": ["cache", "server"]}

    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        jobs.job_dir_for = lambda jid: tmp
        persistence.job_dir_for = lambda jid: tmp
        nodes.job_dir_for = lambda jid: tmp

        state = {"job_id": "t", "fps": 30, "enable_audio": True, "syllabus": syllabus, "scenes": scenes}
        out = nodes.voiceover_node(state)

        assert (tmp / "voiceover.mp3").exists() and (tmp / "voiceover.mp3").stat().st_size > 0, "no audio"
        assert out.get("captions"), "no captions produced"
        sc = out["scenes"]
        # gapless start_frame
        assert sc[0]["start_frame"] == 0
        assert sc[1]["start_frame"] == sc[0]["duration_frames"]
        assert sc[2]["start_frame"] == sc[0]["duration_frames"] + sc[1]["duration_frames"]
        assert sc[0]["duration_frames"] > 0
        # blank scene 3 keeps its estimate duration, emits no captions
        # at least one caption should highlight a key term
        assert any(c["highlight"] for c in out["captions"]), "no highlighted captions"
        hl = sorted({h for c in out["captions"] for h in c["highlight"]})
        print(f"test_voiceover_node: PASS (durs={[s['duration_frames'] for s in sc]}, "
              f"{len(out['captions'])} captions, highlights={hl})")


if __name__ == "__main__":
    main()
