"""Render dispatcher. Picks the engine from config.RENDER_ENGINE (only "remotion"
is supported) and returns the rendered mp4 path. Ported from the standalone
adapter.py, minus the job-dir / manifest / revideo machinery that doesn't exist in
this codebase — here we take the VideoScript dict + slug directly.
"""

from __future__ import annotations

import logging
from pathlib import Path

from config import RENDER_ENGINE, RENDER_DIR
from . import remotion_adapter

logger = logging.getLogger(__name__)


def run(video_script: dict, slug: str) -> Path:
    """Render the given VideoScript to RENDER_DIR/<slug>.mp4 and return the path."""
    if RENDER_ENGINE != "remotion":
        raise RuntimeError(
            f"RENDER_ENGINE='{RENDER_ENGINE}' is unsupported; use 'remotion'."
        )
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RENDER_DIR / f"{slug}.mp4"
    logger.info("[render] engine=%s slug=%s", RENDER_ENGINE, slug)
    return remotion_adapter.render(video_script, output_path, slug=slug)
