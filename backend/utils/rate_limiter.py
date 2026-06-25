"""
backend/utils/rate_limiter.py — Per-model RPM + TPM sliding-window rate limiter.

Each Groq model has a free-tier RPM (requests/min) and TPM (tokens/min) cap.
This module tracks usage in a 60-second sliding window so chat_completion()
can skip a model the moment it would exceed either limit — no wait, just
immediate fallback to the next model in the chain.

Usage flow inside api.py:
    if not limiter.can_use(model, estimated_tokens):
        continue              # skip; try next model
    ...
    limiter.record(model, actual_tokens)   # after successful call
    # or
    limiter.exhaust(model)                 # on 429 — blackout for ~60 s
"""

import threading
import time
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Model catalogue — sorted by TPM descending (best throughput first).
# Source: Groq free-tier limits (official console, June 2025).
# prompt-guard and safeguard/whisper models are excluded (not chat-completion).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ModelConfig:
    model_id: str
    rpm: int          # requests per minute
    tpm: int          # tokens per minute
    max_tokens: int = 8_192   # hard cap we pass to the API


# Keep this list sorted by tpm descending; ties broken by rpm descending.
ORDERED_MODELS: list[ModelConfig] = [
    ModelConfig("groq/compound",                             rpm=30,  tpm=70_000),
    ModelConfig("groq/compound-mini",                        rpm=30,  tpm=70_000),
    ModelConfig("meta-llama/llama-4-scout-17b-16e-instruct", rpm=30,  tpm=30_000),
    ModelConfig("llama-3.3-70b-versatile",                   rpm=30,  tpm=12_000),
    ModelConfig("openai/gpt-oss-120b",                       rpm=30,  tpm=8_000),
    ModelConfig("openai/gpt-oss-20b",                        rpm=30,  tpm=8_000),
    ModelConfig("qwen/qwen3.6-27b",                          rpm=30,  tpm=8_000),
    ModelConfig("llama-3.1-8b-instant",                      rpm=30,  tpm=6_000, max_tokens=3_500),
    ModelConfig("qwen/qwen3-32b",                            rpm=60,  tpm=6_000),  # highest RPM — last resort
]

# Fast lookup by model_id
_MODEL_MAP: dict[str, ModelConfig] = {m.model_id: m for m in ORDERED_MODELS}


# ---------------------------------------------------------------------------
# Sliding-window tracker (one per model)
# ---------------------------------------------------------------------------

class _Window:
    """60-second sliding window tracking requests and token usage for one model."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._req_times: list[float] = []           # one entry per request
        self._tok_log: list[tuple[float, int]] = []  # (timestamp, tokens_used)

    def _prune(self, now: float) -> None:
        cutoff = now - 60.0
        self._req_times = [t for t in self._req_times if t > cutoff]
        self._tok_log = [(t, n) for t, n in self._tok_log if t > cutoff]

    def can_use(self, rpm: int, tpm: int, est_tokens: int) -> bool:
        """Return True if a new request with ~est_tokens would fit within limits."""
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            if len(self._req_times) >= rpm:
                return False
            if tpm > 0 and (sum(n for _, n in self._tok_log) + est_tokens) > tpm:
                return False
            return True

    def record(self, tokens: int) -> None:
        """Record a completed request and its actual token cost."""
        now = time.monotonic()
        with self._lock:
            self._req_times.append(now)
            self._tok_log.append((now, tokens))

    def exhaust(self, rpm: int) -> None:
        """Fill the RPM bucket so this model is skipped for ~60 s after a 429."""
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            while len(self._req_times) < rpm:
                self._req_times.append(now)
            # also spike tokens to tpm so tpm check also fails
            self._tok_log.append((now, 999_999))

    def stats(self) -> dict:
        """Return current window stats for logging."""
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            return {
                "requests_in_window": len(self._req_times),
                "tokens_in_window": sum(n for _, n in self._tok_log),
            }


# ---------------------------------------------------------------------------
# Public singleton
# ---------------------------------------------------------------------------

class RateLimiter:
    """
    Thread-safe rate limiter for all Groq models.

    Typical usage in api.py:
        est = estimate_tokens(messages)
        for cfg in limiter.ordered_models():
            if not limiter.can_use(cfg.model_id, est):
                logger.info("skip %s — at limit", cfg.model_id)
                continue
            try:
                response = groq.chat.completions.create(model=cfg.model_id, ...)
                limiter.record(cfg.model_id, response.usage.total_tokens)
                return response
            except RateLimitError:
                limiter.exhaust(cfg.model_id)
    """

    def __init__(self) -> None:
        self._windows: dict[str, _Window] = {m.model_id: _Window() for m in ORDERED_MODELS}

    def ordered_models(self, start_from: str | None = None) -> list[ModelConfig]:
        """
        Return ORDERED_MODELS starting at start_from (inclusive).
        If start_from is not in the list, returns the full list.
        """
        if start_from is None:
            return list(ORDERED_MODELS)
        idx = next((i for i, m in enumerate(ORDERED_MODELS) if m.model_id == start_from), 0)
        return list(ORDERED_MODELS[idx:])

    def can_use(self, model_id: str, est_tokens: int) -> bool:
        cfg = _MODEL_MAP.get(model_id)
        if cfg is None:
            return True  # unknown model — don't block it
        window = self._windows[model_id]
        return window.can_use(cfg.rpm, cfg.tpm, est_tokens)

    def record(self, model_id: str, tokens: int) -> None:
        if model_id in self._windows:
            self._windows[model_id].record(tokens)

    def exhaust(self, model_id: str) -> None:
        cfg = _MODEL_MAP.get(model_id)
        if cfg and model_id in self._windows:
            self._windows[model_id].exhaust(cfg.rpm)

    def stats(self) -> dict:
        return {m: self._windows[m].stats() for m in self._windows}


# Singleton — shared across the whole process
limiter = RateLimiter()


# ---------------------------------------------------------------------------
# Token estimator (pre-flight, before we know actual usage)
# ---------------------------------------------------------------------------

def estimate_tokens(messages: list[dict]) -> int:
    """
    Rough token estimate from message list content.
    Uses ~3.5 chars per token (conservative for English + code).
    Adds a 10% safety margin.
    """
    chars = sum(len(m.get("content") or "") for m in messages)
    return int(chars / 3.5 * 1.10)
