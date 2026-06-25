"""
backend/utils/tracing.py — Langfuse v4 observability helpers.

Langfuse v4 is OpenTelemetry-based. Key APIs used:
  - @observe(as_type="generation"|"agent")  — decorator for function-level spans
  - lf.start_as_current_observation(...)    — context manager for block-level spans
  - lf.update_current_generation(...)       — update the active generation's model/tokens
  - lf.get_trace_url()                      — get link to this trace in the UI

All exports degrade gracefully when langfuse is not installed or env vars are missing:
  - get_langfuse() → None
  - observe         → no-op decorator
  - is_enabled()    → False
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy singleton client
# ---------------------------------------------------------------------------

_client = None
_initialised = False


def is_enabled() -> bool:
    """True when LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set."""
    return bool(os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"))


def get_langfuse():
    """Return (lazily creating) the Langfuse v4 singleton, or None."""
    global _client, _initialised
    if _initialised:
        return _client
    _initialised = True

    if not is_enabled():
        logger.debug("Langfuse disabled — set LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY to enable")
        return None

    try:
        from langfuse import Langfuse

        # Support both LANGFUSE_HOST (old) and LANGFUSE_BASE_URL (v4 default env name)
        host = (
            os.getenv("LANGFUSE_HOST")
            or os.getenv("LANGFUSE_BASE_URL")
            or "https://cloud.langfuse.com"
        )
        _client = Langfuse(
            public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
            secret_key=os.environ["LANGFUSE_SECRET_KEY"],
            host=host,
        )
        logger.info("✅ Langfuse v4 tracing enabled → %s", host)
    except ImportError:
        logger.warning("langfuse not installed — run: uv add langfuse")
    except Exception as exc:
        logger.warning("Langfuse client init failed: %s", exc)

    return _client


# ---------------------------------------------------------------------------
# @observe — re-exported with a safe no-op fallback
#
# Usage in any module:
#     from utils.tracing import observe
#     @observe(as_type="generation")
#     def my_fn(): ...
# ---------------------------------------------------------------------------

try:
    from langfuse import observe  # noqa: F401 — re-exported for consumers
    _HAS_OBSERVE = True
except ImportError:
    _HAS_OBSERVE = False

    def observe(*args, **kwargs):  # type: ignore[misc]
        """No-op stand-in when langfuse is not installed."""
        if args and callable(args[0]):
            return args[0]
        return lambda fn: fn


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def flush() -> None:
    """Flush pending events. Call at server shutdown."""
    if _client is not None:
        try:
            _client.flush()
        except Exception:
            pass
