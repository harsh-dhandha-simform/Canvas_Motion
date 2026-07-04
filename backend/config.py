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

# Shared directory for catalog
SHARED_DIR = REPO_ROOT / "shared"
COMPONENT_CATALOG_PATH = SHARED_DIR / "componentCatalog.json"
EXAMPLES_DIR = SHARED_DIR / "examples"

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

# ---------------------------------------------------------------------------
# LLM backend selection
# ---------------------------------------------------------------------------
# "ask"  → route every agent call through the self-hosted /ask endpoint
#          (Claude Code CLI behind ask_server.py)
# "groq" → original Groq fallback-chain client
LLM_BACKEND: str = os.environ.get("LLM_BACKEND", "ask")

# Self-hosted custom LLM endpoint.
# Primary env vars: CUSTOM_LLM_URL, CUSTOM_LLM_TOKEN
# Legacy fallbacks:  ASK_URL, ASK_API_KEY  (for backward compatibility)
ASK_URL: str = (
    os.environ.get("CUSTOM_LLM_URL")
    or os.environ.get("ASK_URL", "http://0.0.0.0:8080/ask")
)
ASK_API_KEY: str = (
    os.environ.get("CUSTOM_LLM_TOKEN")
    or os.environ.get("ASK_API_KEY", "")
)
ASK_MODEL: str = os.environ.get("ASK_MODEL", "sonnet")
ASK_THINKING: str = os.environ.get("ASK_THINKING", "disabled")
ASK_EFFORT: str = os.environ.get("ASK_EFFORT", "max")
# Client timeout must exceed the custom endpoint's own timeout so the
# server's clean timeout response wins over a client-side socket cutoff.
ASK_TIMEOUT_SECONDS: int = int(os.environ.get("ASK_TIMEOUT_SECONDS", "660"))

if LLM_BACKEND == "groq" and not GROQ_API_KEY:
    raise EnvironmentError(
        "GROQ_API_KEY environment variable is not set. "
        "Export it before running the pipeline:\n"
        "  export GROQ_API_KEY=gsk_..."
    )

# Default starting model — chat_completion walks ORDERED_MODELS from here.
# Set to the highest-TPM model so cold starts pick the best available.
GROQ_MODEL = "groq/compound"

# Kept for server.py health endpoint display
GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------------
# Rate-limit mitigation
# ---------------------------------------------------------------------------

# Max retries for non-rate-limit errors (e.g. empty response, transient 5xx).
# Rate-limit (429/413) errors never wait — they instantly exhaust the model
# window and fall through to the next candidate in the ordered chain.
MAX_RETRIES: int = 2

# Initial backoff for non-429 retryable errors
INITIAL_BACKOFF_SECONDS: float = 2.0

# ---------------------------------------------------------------------------
# Video canvas defaults (must match Root.tsx Composition props)
# ---------------------------------------------------------------------------

VIDEO_WIDTH: int = 1920
VIDEO_HEIGHT: int = 1080
VIDEO_FPS: int = 30
VIDEO_DURATION_FRAMES: int = 4500  # 150 seconds @ 30 fps (default for in-depth content)
