"""Langfuse tracing helper (v4 OTel-based SDK). Degrades to a no-op stub when keys
are missing or the SDK errors, so the rest of the codebase never has to check
whether tracing is enabled.
"""

from __future__ import annotations

import contextlib
from typing import Any, Iterator

from app.config import get_settings


class _NoOpHandle:
    def end(self, *args: Any, **kwargs: Any) -> None:
        pass

    def update(self, *args: Any, **kwargs: Any) -> None:
        pass


class _NoOpTracer:
    """Stand-in for the Langfuse client when tracing is disabled or misconfigured."""

    def create_trace_id(self, *args: Any, **kwargs: Any) -> None:
        return None

    def start_observation(self, *args: Any, **kwargs: Any) -> _NoOpHandle:
        return _NoOpHandle()

    def flush(self) -> None:
        pass


_tracer_instance: Any = None
_current_trace_id: str | None = None


def get_tracer() -> Any:
    """Returns a configured Langfuse client, or a no-op stub if keys are missing/invalid."""
    global _tracer_instance
    if _tracer_instance is not None:
        return _tracer_instance

    settings = get_settings()
    if not settings.langfuse_enabled:
        _tracer_instance = _NoOpTracer()
        return _tracer_instance

    try:
        from langfuse import Langfuse

        _tracer_instance = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    except Exception:
        _tracer_instance = _NoOpTracer()
    return _tracer_instance


def start_trace(job_id: str) -> str | None:
    """Starts the single trace for a job: derives a deterministic trace_id from job_id
    so every later span() call in this process attaches to the same trace. Never raises.
    """
    global _current_trace_id
    try:
        _current_trace_id = get_tracer().create_trace_id(seed=job_id)
    except Exception:
        _current_trace_id = None
    return _current_trace_id


@contextlib.contextmanager
def span(
    name: str, *, as_type: str = "span", input: Any = None, model: str | None = None, **metadata: Any
) -> Iterator[Any]:
    """Wraps an LLM/TTS/stage call in a span (or generation, via `as_type="generation"`),
    attached to the current job's trace (see start_trace). Yields the observation
    handle — the caller records the result with `handle.update(output=..., ...)`
    before the block exits; nothing is recorded automatically. No-op (and never
    raises) if tracing is disabled or the SDK call fails.
    """
    tracer = get_tracer()
    try:
        trace_context = None
        if _current_trace_id is not None:
            from langfuse.types import TraceContext

            trace_context = TraceContext(trace_id=_current_trace_id)
        handle = tracer.start_observation(
            name=name, as_type=as_type, input=input, model=model, metadata=metadata, trace_context=trace_context
        )
    except Exception:
        handle = _NoOpHandle()

    try:
        yield handle
    except Exception as exc:
        try:
            handle.update(level="ERROR", status_message=str(exc))
        except Exception:
            pass
        raise
    finally:
        try:
            handle.end()
        except Exception:
            pass
