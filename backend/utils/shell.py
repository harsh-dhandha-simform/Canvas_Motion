"""
backend/utils/shell.py — Safe subprocess runner for npm/npx commands.

All shell interactions (npm install, npx remotion studio, npx remotion render)
go through this module to provide consistent error handling and logging.
"""

import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


def run(
    cmd: list[str],
    *,
    cwd: Path | str | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
    capture_output: bool = True,
) -> subprocess.CompletedProcess[str]:
    """
    Run a shell command and return the CompletedProcess result.

    Args:
        cmd:            Command tokens, e.g. ["npm", "run", "dev"]
        cwd:            Working directory for the subprocess
        env:            Optional environment variable overrides
        check:          If True, raises CalledProcessError on non-zero exit
        capture_output: If True, captures stdout/stderr for logging

    Returns:
        subprocess.CompletedProcess with stdout/stderr as strings

    Raises:
        subprocess.CalledProcessError: When check=True and exit code != 0
    """
    cmd_str = " ".join(str(c) for c in cmd)
    logger.info("🔧 Running: %s (cwd=%s)", cmd_str, cwd or ".")

    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=capture_output,
        text=True,
    )

    if result.stdout:
        logger.debug("stdout:\n%s", result.stdout.strip())
    if result.stderr:
        logger.debug("stderr:\n%s", result.stderr.strip())

    if check and result.returncode != 0:
        logger.error(
            "❌ Command failed (exit %d): %s\nstderr: %s",
            result.returncode,
            cmd_str,
            result.stderr.strip(),
        )
        raise subprocess.CalledProcessError(
            result.returncode, cmd, result.stdout, result.stderr
        )

    logger.info("✅ Command succeeded: %s", cmd_str)
    return result


def npm_install(frontend_root: Path) -> None:
    """Install npm dependencies in the frontend directory."""
    run(["npm", "install"], cwd=frontend_root)


def npm_run_dev(frontend_root: Path) -> subprocess.CompletedProcess[str]:
    """Start the Remotion Studio dev server (non-blocking helper)."""
    return run(["npm", "run", "dev"], cwd=frontend_root, check=False, capture_output=False)


def remotion_render(
    frontend_root: Path,
    composition_id: str,
    output_path: Path,
) -> None:
    """Trigger a Remotion render for a specific composition."""
    run(
        [
            "npx",
            "remotion",
            "render",
            composition_id,
            str(output_path),
        ],
        cwd=frontend_root,
    )
