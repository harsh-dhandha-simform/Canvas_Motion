"""
backend/utils/api.py — Groq API wrapper with automatic retry on rate-limit errors.

Wraps every chat-completion call with:
  • Exponential backoff + jitter on HTTP 429 (RateLimitError)
  • Respect for the `retry-after` header when present
  • Fallback to a lighter model after MAX_RETRIES exhausted
  • Structured logging so the operator can monitor progress
"""

import logging
import random
import re
import time
from typing import Any

from groq import Groq, RateLimitError, APIStatusError

from config import (
    GROQ_API_KEY,
    GROQ_FALLBACK_MODEL,
    GROQ_MODEL,
    INITIAL_BACKOFF_SECONDS,
    MAX_RETRIES,
)

logger = logging.getLogger(__name__)

# Singleton Groq client — reused across all agents
_client: Groq | None = None


def get_client() -> Groq:
    """Return (or lazily create) the shared Groq client."""
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY, max_retries=0)
    return _client


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str = GROQ_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 8192,
    agent_name: str = "agent",
) -> str:
    """
    Send a chat-completion request to Groq with a robust fallback chain of models
    to bypass rate limit waits (HTTP 429) and payload limits (HTTP 413).
    """
    # Fallback chain of Groq models
    chain = [
        "openai/gpt-oss-120b",
        "groq/compound",
        "qwen/qwen3-32b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
    ]
    if model in chain:
        idx = chain.index(model)
        models_to_try = chain[idx:]
    else:
        models_to_try = [model] + chain

    last_error: Exception | None = None

    for current_model in models_to_try:
        # Fallback models have tighter context/limits, cap max_tokens accordingly
        if current_model == "llama-3.1-8b-instant":
            current_max_tokens = min(max_tokens, 3500)
        elif current_model in ("qwen/qwen3.6-27b", "qwen/qwen3-32b"):
            current_max_tokens = min(max_tokens, 6000)
        else:
            current_max_tokens = min(max_tokens, 8192)
        client = get_client()

        backoff = INITIAL_BACKOFF_SECONDS

        for attempt in range(MAX_RETRIES + 1):
            try:
                logger.info(
                    "[%s] Calling Groq model=%s attempt=%d/%d",
                    agent_name,
                    current_model,
                    attempt + 1,
                    MAX_RETRIES + 1,
                )
                response = client.chat.completions.create(
                    model=current_model,
                    messages=messages,  # type: ignore[arg-type]
                    temperature=temperature,
                    max_tokens=current_max_tokens,
                )
                content: str = response.choices[0].message.content or ""
                # Strip reasoning/thinking tags (e.g. from Qwen/DeepSeek models)
                content = re.sub(
                    r"<think>.*?</think>", "", content, flags=re.DOTALL
                ).strip()

                if not content.strip():
                    logger.warning(
                        "[%s] ⚠️ Empty response from %s. Finish reason: %s. Response message: %s. Usage: %s. Retrying...",
                        agent_name,
                        current_model,
                        response.choices[0].finish_reason,
                        response.choices[0].message,
                        response.usage,
                    )
                    last_error = RuntimeError(
                        f"Model returned empty content (finish_reason: {response.choices[0].finish_reason})"
                    )
                    time.sleep(backoff + random.uniform(0, 2))
                    backoff *= 2
                    continue

                logger.info(
                    "[%s] ✅ Success on model %s — tokens used: %s",
                    agent_name,
                    current_model,
                    response.usage,
                )
                return content

            except APIStatusError as exc:
                last_error = exc

                # If payload too large / TPM limit exceeded (413), fallback immediately
                if exc.status_code == 413:
                    logger.warning(
                        "[%s] ⚠️ Payload/TPM too large (413) on model %s. Switching to fallback in chain.",
                        agent_name,
                        current_model,
                    )
                    break  # Break out of attempt loop to try next model in fallback chain

                # Otherwise treat as standard rate limit / retryable status error (e.g. 429)
                retry_after: float | None = _parse_retry_after(exc)
                wait = retry_after if retry_after else backoff + random.uniform(0, 2)

                # If wait time is too long, switch model immediately instead of blocking
                if wait > 120.0:
                    logger.warning(
                        "[%s] ⚠️ Rate limit wait time too large (%.1fs) on model %s. Switching to next fallback model.",
                        agent_name,
                        wait,
                        current_model,
                    )
                    break  # Break out of attempt loop to try next model in fallback chain

                if attempt < MAX_RETRIES:
                    logger.warning(
                        "[%s] ⚠️ API status error %d (attempt %d/%d). Error details: %s. Waiting %.1fs …",
                        agent_name,
                        exc.status_code,
                        attempt + 1,
                        MAX_RETRIES,
                        str(exc),
                        wait,
                    )
                    time.sleep(wait)
                    backoff *= 2  # Exponential growth
                else:
                    # Swapping to next model in the fallback list
                    break

            except Exception as exc:
                logger.error("[%s] ❌ Unexpected error: %s", agent_name, exc)
                raise

    raise RuntimeError(
        f"[{agent_name}] All fallback models on Groq exhausted. Last error: {last_error}"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_retry_after(exc: RateLimitError) -> float | None:
    """Extract the Retry-After value (in seconds) from the exception headers."""
    try:
        # The Groq SDK surfaces the raw response on the exception
        headers: Any = getattr(exc, "response", None) and exc.response.headers  # type: ignore[union-attr]
        if headers:
            value = headers.get("retry-after") or headers.get("Retry-After")
            if value:
                return float(value)
    except Exception:
        pass
    return None


def extract_json(text: str) -> str:
    """Extract a JSON substring from a text block, handling markdown codeblocks and extra prose."""
    import re

    # Try to find a markdown block first
    markdown_json = re.search(r"```(?:json)?\s*([{\[].*?[}\]])\s*```", text, re.DOTALL)
    if markdown_json:
        return markdown_json.group(1).strip()

    # If not, find the first occurrence of { or [ and last occurrence of } or ]
    first_brace = min(
        [pos for pos in [text.find("{"), text.find("[")] if pos != -1], default=-1
    )
    last_brace = max(
        [pos for pos in [text.rfind("}"), text.rfind("]")] if pos != -1], default=-1
    )

    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1].strip()

    return text.strip()


_PRIMARY_MODEL = "openai/gpt-oss-120b"
_FALLBACK_MODEL = "compound-beta"

_MODEL_CHAIN = [
    _PRIMARY_MODEL,
    _FALLBACK_MODEL,
    "llama-3.3-70b-versatile",
]


def call_llm(prompt: str, system_prompt: str) -> tuple[str, str, bool]:
    """
    Send a chat completion request, trying the primary model first and falling
    back to the fallback model on any exception.

    Returns:
        (content, model_used, fallback_triggered)
    """
    import re
    from fastapi import HTTPException

    client = get_client()
    last_error = None
    fallback_triggered = False

    for i, model in enumerate(_MODEL_CHAIN):
        if i > 0:
            fallback_triggered = True

        try:
            logger.info("[call_llm] Trying model: %s", model)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=4096,
            )
            content = response.choices[0].message.content or ""
            content = re.sub(
                r"<think>.*?</think>", "", content, flags=re.DOTALL
            ).strip()

            if not content.strip():
                last_error = RuntimeError(f"Empty response from {model}")
                continue

            logger.info("[call_llm] ✅ Success with model: %s", model)
            return content, model, fallback_triggered

        except Exception as exc:
            last_error = exc
            logger.warning("[call_llm] ⚠️ Model %s failed: %s", model, exc)
            continue

    raise HTTPException(
        status_code=503,
        detail=f"All LLM models failed. Last error: {last_error}",
    )
