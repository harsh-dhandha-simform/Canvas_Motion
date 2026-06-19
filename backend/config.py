"""
config.py — Global configuration for the 6-Agent Video Production Pipeline.

Reads secrets from environment variables and defines shared constants
used by all agents and utilities.
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# Root of the monorepo  (my-video/)
REPO_ROOT = Path(__file__).resolve().parent.parent

# Remotion frontend project root
FRONTEND_ROOT = REPO_ROOT / "frontend"

# Directory where the Code-Generator agent writes all files.
# Root.tsx imports GeneratedVideo from this directory.
GENERATED_DIR = FRONTEND_ROOT / "src" / "generated"

# Root.tsx path — updated by orchestrator to register the generated composition
ROOT_TSX_PATH = FRONTEND_ROOT / "src" / "Root.tsx"

# ---------------------------------------------------------------------------
# Groq API
# ---------------------------------------------------------------------------

# Load from .env file if it exists at the repo root
_env_path = REPO_ROOT / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ[_k.strip()] = _v.strip().strip("'\"")

GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")

if not GROQ_API_KEY:
    raise EnvironmentError(
        "GROQ_API_KEY environment variable is not set. "
        "Export it before running the pipeline:\n"
        "  export GROQ_API_KEY=gsk_..."
    )

# Primary model
GROQ_MODEL = "openai/gpt-oss-120b"

# Fallback model if the primary hits quota
GROQ_FALLBACK_MODEL = "groq/compound"

# ---------------------------------------------------------------------------
# Rate-limit mitigation
# ---------------------------------------------------------------------------

# Seconds to sleep between consecutive agent calls to stay under RPM limits
INTER_AGENT_DELAY_SECONDS: float = 2.0

# Maximum number of automatic retries on a 429 RateLimitError
MAX_RETRIES: int = 4

# Initial backoff window in seconds (doubles on each retry + jitter)
INITIAL_BACKOFF_SECONDS: float = 5.0

# ---------------------------------------------------------------------------
# Video canvas defaults (must match Root.tsx Composition props)
# ---------------------------------------------------------------------------

VIDEO_WIDTH: int = 1920
VIDEO_HEIGHT: int = 1080
VIDEO_FPS: int = 30
VIDEO_DURATION_FRAMES: int = 4500  # 150 seconds @ 30 fps (default for in-depth content)
