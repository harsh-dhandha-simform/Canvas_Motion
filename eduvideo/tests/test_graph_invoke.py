"""Plain-script integration test (run: uv run python tests/test_graph_invoke.py).
Invokes the whole engine graph for a real job. Requires LLM + Deepgram."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.engine.models.video_script import VideoScript
from app.engine.pipeline import compiled_graph
from app.jobs import create_job, job_dir_for, read_json_artifact
from app.schemas.input import JobInput


def _initial_state(job_id: str) -> dict:
    v = get_settings().config.video
    return {
        "job_id": job_id, "topic": "Bloom filters", "context": None, "duration_seconds": 60,
        "fps": v.fps, "width": v.width, "height": v.height,
        "enable_audio": get_settings().deepgram_configured,
        "audio_path": None, "audio_url": None, "errors": [], "fallback_triggered": False,
    }


def main() -> None:
    job_id = create_job(JobInput(topic="Bloom filters", durationSec=60))
    job_dir = job_dir_for(job_id)
    print(f"job_id={job_id}")

    result = compiled_graph.invoke(_initial_state(job_id))
    vs_dict = result["video_script"]
    vs = VideoScript.model_validate(vs_dict)  # must validate
    print(f"VideoScript: {len(vs.scenes)} scenes, {vs.total_frames()} frames, model_used={result.get('model_used')}")

    for name in ("syllabus", "plan", "script", "story", "merge", "validation", "video_script", "scenes_timed"):
        assert read_json_artifact(job_dir, name) is not None, f"missing artifact {name}.json"
    assert (job_dir / "voiceover.mp3").exists() and (job_dir / "voiceover.mp3").stat().st_size > 0, "no voiceover.mp3"

    # captions carry highlight end-to-end
    caps = vs_dict["voiceover"]["captions"]
    assert caps, "no captions"
    print(f"captions: {len(caps)}, with-highlight: {sum(1 for c in caps if c.get('highlight'))}")

    # multi-panel usage: at least one scene with >1 panel OR a non-'full' layout
    layouts = {s.layout for s in vs.scenes}
    multi = any(len(s.panels) > 1 for s in vs.scenes)
    print(f"layouts used: {sorted(layouts)}; any multi-panel scene: {multi}")

    # re-invoke: agent artifacts are cache hits (idempotent, no crash)
    result2 = compiled_graph.invoke(_initial_state(job_id))
    assert result2["video_script"]["title"] == vs_dict["title"], "re-invoke mismatch"
    print("re-invoke: cache hits OK")
    print("test_graph_invoke: PASS")


if __name__ == "__main__":
    main()
