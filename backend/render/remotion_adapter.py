"""Remotion render adapter. Renders a VideoScript dict to mp4 via `npx remotion
render`. Ported from the standalone remotion_adapter.py, adapted to this repo:

- composition is "DynamicVideo" (props-driven via calculateMetadata in Root.tsx),
- config comes from config.py module constants (not get_settings().config.render),
- audio is served over HTTP by the running API server (audio_url already points at
  /audio/<slug>.mp3), so there is NO public/ + staticFile staging like the source.

Writes <slug>.mp4 (+ <slug>.props.json and <slug>.render.log) into RENDER_DIR.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any

from config import (
    FRONTEND_ROOT,
    RENDER_DIR,
    RENDER_TIMEOUT_SECONDS,
    RENDER_CONCURRENCY,
    RENDER_SCALE,
    RENDER_CRF,
    REMOTION_BROWSER_EXECUTABLE,
)

logger = logging.getLogger(__name__)

# Remotion's own concurrency detection is unreliable in sandboxed/containerized
# environments, so pass an explicit value derived from the actual core count,
# leaving one core free for the OS/other processes.
_CPU_COUNT = os.cpu_count() or 4


def _concurrency() -> str:
    if RENDER_CONCURRENCY.strip():
        return RENDER_CONCURRENCY.strip()
    return str(max(1, _CPU_COUNT - 1))


def build_remotion_props(video_script: dict, audio_url: str | None = None) -> dict[str, Any]:
    """Near-identity over the native VideoScript. The pipeline already sets audio_url
    (/audio/<slug>.mp3, served over HTTP); only override when a caller passes one."""
    props = dict(video_script)
    if audio_url is not None:
        props["audio_url"] = audio_url
    return props


def render(video_script: dict, output_path: Path, *, slug: str) -> Path:
    """Render `video_script` to `output_path` (mp4). Raises on any failure.

    The props are written to disk and passed via --props so the composition's
    calculateMetadata derives the right duration/dimensions.
    """
    RENDER_DIR.mkdir(parents=True, exist_ok=True)

    props = build_remotion_props(video_script)
    props_path = RENDER_DIR / f"{slug}.props.json"
    props_path.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    cmd = [
        "npx", "remotion", "render",
        "src/index.ts", "DynamicVideo",
        str(output_path.resolve()),
        f"--props={props_path.resolve()}",
        f"--concurrency={_concurrency()}",
        f"--scale={RENDER_SCALE}",
        f"--crf={RENDER_CRF}",
    ]
    # Use a provided Chrome instead of Remotion's auto-downloaded headless shell
    # when set — required where the runtime can't reach the chromium download host.
    browser = REMOTION_BROWSER_EXECUTABLE.strip()
    if browser:
        cmd.append(f"--browser-executable={browser}")

    logger.info("[render] slug=%s → %s", slug, output_path.name)
    result = subprocess.run(
        cmd,
        cwd=str(FRONTEND_ROOT),
        capture_output=True,
        text=True,
        timeout=RENDER_TIMEOUT_SECONDS,
    )
    (RENDER_DIR / f"{slug}.render.log").write_text(
        f"{result.stdout}\n{result.stderr}", encoding="utf-8"
    )
    if result.returncode != 0:
        tail = "\n".join(result.stderr.strip().splitlines()[-20:])
        raise RuntimeError(f"render (remotion): renderer subprocess exited {result.returncode}: {tail}")
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("render (remotion): subprocess exited 0 but rendered mp4 is missing or empty")

    logger.info("[render] ✅ slug=%s wrote %d bytes", slug, output_path.stat().st_size)
    return output_path
