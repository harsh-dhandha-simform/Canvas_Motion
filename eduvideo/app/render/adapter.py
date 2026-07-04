"""Revideo adapter (MASTER_CONTEXT.md §2 stage 10). The ONLY Python module aware
that the renderer is Revideo — swapping renderers later means touching only this
file + renderer/. Invokes `npm run render` (renderer/render.ts, Phase 9) as a
subprocess against the job's video_plan.json + voiceover.mp3, and writes
rendered.mp4 back into the job dir (render.ts's own contract).
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from app.clients.tracing import span
from app.config import BASE_DIR, get_settings
from app.jobs import read_manifest


def run(job_dir: Path) -> None:
    if not (job_dir / "video_plan.json").exists():
        raise RuntimeError("render: video_plan.json does not exist — video_plan stage must run first")
    if "validate" not in read_manifest(job_dir).stages_done:
        raise RuntimeError("render: video_plan.json has not passed validation yet")

    render_cfg = get_settings().config.render
    renderer_dir = BASE_DIR / render_cfg.renderer_dir

    with span("render", input=str(job_dir)) as obs:
        result = subprocess.run(
            ["npm", "run", "render", "--", str(job_dir.resolve())],
            cwd=str(renderer_dir),
            capture_output=True,
            text=True,
            timeout=render_cfg.timeout_seconds,
        )
        (job_dir / "render.log").write_text(f"{result.stdout}\n{result.stderr}", encoding="utf-8")

        if result.returncode != 0:
            tail = "\n".join(result.stderr.strip().splitlines()[-20:])
            obs.update(output=f"FAILED (exit {result.returncode})", level="ERROR")
            raise RuntimeError(f"render: renderer subprocess exited {result.returncode}: {tail}")

        rendered_path = job_dir / "rendered.mp4"
        if not rendered_path.exists() or rendered_path.stat().st_size == 0:
            raise RuntimeError("render: renderer subprocess exited 0 but rendered.mp4 is missing or empty")

        # Revideo writes its own scratch files (per-worker/audio/visuals-only
        # exports) straight into outDir since we point it at the job dir directly —
        # clean up everything except the final muxed rendered.mp4.
        for scratch_file in job_dir.glob("rendered-*"):
            scratch_file.unlink(missing_ok=True)

        obs.update(output=f"rendered.mp4: {rendered_path.stat().st_size} bytes")
