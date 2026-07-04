"""Render stage dispatcher (MASTER_CONTEXT.md §2 stage 10). Picks the renderer
engine from config.render.engine:
  - "revideo" (default): this file's own subprocess call to `npm run render`
    (renderer/render.ts) — unchanged from Phase 9/10.
  - "remotion": delegates to remotion_adapter.py, the only module aware of the
    Remotion project's component names/props.
Either path writes rendered.mp4 back into the job dir — orchestrator.py and
every downstream stage (player) don't need to know which engine ran.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from app.clients.tracing import span
from app.config import BASE_DIR, get_settings
from app.jobs import read_manifest
from app.render import remotion_adapter


def run(job_dir: Path) -> None:
    if not (job_dir / "video_plan.json").exists():
        raise RuntimeError("render: video_plan.json does not exist — video_plan stage must run first")
    if "validate" not in read_manifest(job_dir).stages_done:
        raise RuntimeError("render: video_plan.json has not passed validation yet")

    render_cfg = get_settings().config.render

    with span("render", input=str(job_dir), engine=render_cfg.engine) as obs:
        if render_cfg.engine == "remotion":
            renderer_dir = BASE_DIR / render_cfg.remotion_dir
            remotion_adapter.render(job_dir, renderer_dir, render_cfg.timeout_seconds)
            rendered_path = job_dir / "rendered.mp4"
            obs.update(output=f"rendered.mp4: {rendered_path.stat().st_size} bytes (remotion)")
            return

        renderer_dir = BASE_DIR / render_cfg.renderer_dir
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
