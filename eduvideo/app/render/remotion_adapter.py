"""Remotion render adapter (config.render.engine == "remotion"). The renderer_remotion/
project's `EduVideo` composition consumes the VideoScript natively, so this adapter is
a thin shim: it loads the assembler's video_script.json (already in VideoScriptProps
shape — rich multi-panel scenes, per-scene narration, keyword-highlight captions),
injects the per-render audio filename, writes remotion_plan.json, and invokes
`npx remotion render`. There is no template→component mapping: the LangGraph engine
already emits exactly what the renderer wants.

Writes rendered.mp4 back into job_dir — same on-disk contract as any render engine, so
orchestrator.py never needs to know which engine ran.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any


def build_remotion_plan(video_script: dict, audio_filename: str | None) -> dict[str, Any]:
    """Near-identity over the native VideoScript: only audio_url is (re)set, since the
    physical audio filename is chosen per-render (the assembler leaves audio_url null).
    Subtitle/caption RENDERING (CaptionLayer.tsx) and every scene/panel pass through
    untouched."""
    plan = dict(video_script)
    plan["audio_url"] = audio_filename
    return plan


def render(job_dir: Path, renderer_dir: Path, timeout_seconds: float) -> None:
    video_script = json.loads((job_dir / "video_script.json").read_text(encoding="utf-8"))
    voiceover_path = job_dir / "voiceover.mp3"

    # Audio is optional — a job may render silent (e.g. TTS unavailable). Only when a
    # voiceover exists do we stage it: a unique per-render filename inside the Remotion
    # project's public/ dir (staticFile() resolves relative to it) so two overlapping
    # renders never clobber each other's audio.
    public_dir = renderer_dir / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    audio_path: Path | None = None
    audio_filename: str | None = None
    if voiceover_path.exists() and voiceover_path.stat().st_size > 0:
        audio_filename = f"{job_dir.name}-{uuid.uuid4().hex[:8]}.mp3"
        audio_path = public_dir / audio_filename
        shutil.copyfile(voiceover_path, audio_path)

    remotion_plan = build_remotion_plan(video_script, audio_filename)
    plan_path = job_dir / "remotion_plan.json"
    plan_path.write_text(json.dumps(remotion_plan, indent=2), encoding="utf-8")

    output_path = job_dir / "rendered.mp4"
    try:
        result = subprocess.run(
            [
                "npx",
                "remotion",
                "render",
                "src/index.ts",
                "EduVideo",
                str(output_path.resolve()),
                f"--props={plan_path.resolve()}",
            ],
            cwd=str(renderer_dir),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        (job_dir / "render.log").write_text(f"{result.stdout}\n{result.stderr}", encoding="utf-8")
        if result.returncode != 0:
            tail = "\n".join(result.stderr.strip().splitlines()[-20:])
            raise RuntimeError(f"render (remotion): renderer subprocess exited {result.returncode}: {tail}")
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("render (remotion): subprocess exited 0 but rendered.mp4 is missing or empty")
    finally:
        if audio_path is not None:
            audio_path.unlink(missing_ok=True)
