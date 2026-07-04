"""Render stage dispatcher (MASTER_CONTEXT.md §2 stage 10). Picks the renderer
engine from config.render.engine:
  - "remotion" (default/only supported with the VideoScript engine): delegates to
    remotion_adapter.py, which renders the assembler's video_script.json natively.
  - "revideo": the legacy canvas renderer consumed the old video_plan.json, which the
    LangGraph engine no longer produces — this path is vestigial and raises.
Either path writes rendered.mp4 back into the job dir — orchestrator.py and every
downstream stage (player) don't need to know which engine ran.
"""

from __future__ import annotations

from pathlib import Path

from app.clients.tracing import span
from app.config import BASE_DIR, get_settings
from app.jobs import read_manifest
from app.render import remotion_adapter


def run(job_dir: Path) -> None:
    if not (job_dir / "video_script.json").exists():
        raise RuntimeError("render: video_script.json does not exist — the assembler stage must run first")
    if "assembler" not in read_manifest(job_dir).stages_done:
        raise RuntimeError("render: video_script.json has not been produced by the assembler yet")

    render_cfg = get_settings().config.render

    with span("render", input=str(job_dir), engine=render_cfg.engine) as obs:
        if render_cfg.engine != "remotion":
            raise RuntimeError(
                f"render.engine='{render_cfg.engine}' is unsupported with the VideoScript engine; "
                "use engine: remotion (the legacy Revideo renderer consumed the removed video_plan.json)"
            )

        renderer_dir = BASE_DIR / render_cfg.remotion_dir
        remotion_adapter.render(job_dir, renderer_dir, render_cfg.timeout_seconds)
        rendered_path = job_dir / "rendered.mp4"
        obs.update(output=f"rendered.mp4: {rendered_path.stat().st_size} bytes (remotion)")
