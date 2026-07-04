"""
backend/utils/api.py — Groq API wrapper with RPM + TPM rate-limit awareness.

Each call walks the ORDERED_MODELS chain (highest TPM first).  For every
candidate model it:
  1. Pre-flight: skips if the sliding-window rate limiter says RPM or TPM
     would be exceeded (zero wait — instant fallback).
  2. Calls the Groq API.
  3. On success: records actual token usage so future calls see accurate state.
  4. On 429 / 413: exhausts the model's window so it is skipped for ~60 s,
     then moves to the next candidate without sleeping.
"""

import logging
import re
import time
from typing import Any

from groq import Groq, RateLimitError, APIStatusError

from config import GROQ_API_KEY, GROQ_MODEL, INITIAL_BACKOFF_SECONDS, MAX_RETRIES, LLM_BACKEND
from utils.rate_limiter import limiter, estimate_tokens, ORDERED_MODELS, _MODEL_MAP

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Langfuse v4 — @observe decorator + client, degrade gracefully when absent
# ---------------------------------------------------------------------------
from utils.tracing import observe as _lf_observe, get_langfuse as _get_lf

# Singleton Groq client — reused across all agents
_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY, max_retries=0)
    return _client


@_lf_observe(as_type="generation")
def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str = GROQ_MODEL,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    agent_name: str = "agent",
    response_model: Any = None,
) -> str:
    """
    Send a chat-completion to Groq, walking ORDERED_MODELS (highest-TPM first).

    Rate limiting strategy:
    - Pre-flight RPM+TPM check → skip instantly if at limit (no sleep).
    - 429/413 → exhaust that model's window, move to next immediately.
    - Empty response → 1 retry on same model, then move on.
    - Each successful call records actual token cost in the sliding window.
    """
    lf = _get_lf()
    if lf:
        lf.update_current_generation(
            name=f"{agent_name}-llm",
            input=messages,
            metadata={"agent": agent_name, "requested_model": model, "backend": LLM_BACKEND},
        )

    # ── Backend dispatch ─────────────────────────────────────────────────────
    # Route every agent call through the self-hosted /ask endpoint when enabled.
    if LLM_BACKEND == "ask":
        from utils.ask_client import ask
        from config import ASK_MODEL
        query = _flatten_messages(messages)
        answer = ask(query, agent_name=agent_name)
        if lf:
            lf.update_current_generation(model=f"ask:{ASK_MODEL}", output=answer)
        return answer

    est_tokens = estimate_tokens(messages)
    client = get_client()

    # Build the candidate list: start from the requested model if it's in the
    # catalogue, otherwise walk the full chain.
    candidates = limiter.ordered_models(start_from=model if model in _MODEL_MAP else None)
    if model not in _MODEL_MAP:
        # Prepend the explicitly requested model as a first attempt
        from utils.rate_limiter import ModelConfig
        candidates = [ModelConfig(model, rpm=30, tpm=8_000)] + candidates

    last_error: Exception | None = None
    tried: list[str] = []

    for cfg in candidates:
        current_model = cfg.model_id

        # ── Pre-flight rate-limit check ──────────────────────────────────────
        if not limiter.can_use(current_model, est_tokens):
            w = limiter._windows.get(current_model)
            stats = w.stats() if w else {}
            logger.info(
                "[%s] ⏭ Skip %s — at limit (rpm=%d/%d, tpm=%d/%d)",
                agent_name, current_model,
                stats.get("requests_in_window", "?"), cfg.rpm,
                stats.get("tokens_in_window", "?"), cfg.tpm,
            )
            continue

        current_max_tokens = min(max_tokens, cfg.max_tokens) if max_tokens is not None else cfg.max_tokens
        tried.append(current_model)

        # ── API call with one empty-response retry ───────────────────────────
        for attempt in range(2):  # attempt 0 = first try, attempt 1 = retry on empty
            try:
                logger.info(
                    "[%s] → %s  est_tokens=%d  max_tokens=%d  attempt=%d",
                    agent_name, current_model, est_tokens, current_max_tokens, attempt + 1,
                )
                create_kwargs: dict = dict(
                    model=current_model,
                    messages=list(messages),  # type: ignore[arg-type]
                    temperature=temperature,
                )
                if response_model is not None:
                    import json
                    schema_str = json.dumps(response_model.model_json_schema(), indent=2)
                    schema_instruction = (
                        "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        "## OUTPUT FORMAT\n"
                        "Return ONLY a valid JSON object matching the following JSON Schema:\n"
                        f"{schema_str}\n"
                    )
                    # Safe to mutate since we made a list copy above
                    if create_kwargs["messages"] and create_kwargs["messages"][0].get("role") == "system":
                        create_kwargs["messages"][0] = dict(create_kwargs["messages"][0])
                        create_kwargs["messages"][0]["content"] += schema_instruction
                    else:
                        create_kwargs["messages"].insert(0, {"role": "system", "content": schema_instruction})
                    create_kwargs["response_format"] = {"type": "json_object"}

                if current_max_tokens is not None:
                    create_kwargs["max_tokens"] = current_max_tokens
                response = client.chat.completions.create(**create_kwargs)
                content: str = response.choices[0].message.content or ""
                content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

                if not content.strip():
                    last_error = RuntimeError(
                        f"Empty response from {current_model} "
                        f"(finish={response.choices[0].finish_reason})"
                    )
                    logger.warning("[%s] ⚠️ Empty response — %s", agent_name, last_error)
                    time.sleep(1)
                    continue  # one retry on same model

                usage = response.usage
                actual_tokens = usage.total_tokens if usage else est_tokens
                limiter.record(current_model, actual_tokens)

                logger.info(
                    "[%s] ✅ %s — input=%d output=%d total=%d",
                    agent_name, current_model,
                    usage.prompt_tokens if usage else 0,
                    usage.completion_tokens if usage else 0,
                    actual_tokens,
                )

                if lf:
                    lf.update_current_generation(
                        model=current_model,
                        output=content,
                        usage_details={
                            "input_tokens": usage.prompt_tokens if usage else 0,
                            "output_tokens": usage.completion_tokens if usage else 0,
                        },
                    )
                return content

            except APIStatusError as exc:
                last_error = exc
                if exc.status_code in (429, 413):
                    limiter.exhaust(current_model)
                    logger.warning(
                        "[%s] ⚡ %s HTTP %d — exhausted window, trying next model",
                        agent_name, current_model, exc.status_code,
                    )
                    break  # skip to next model immediately — no sleep
                else:
                    logger.warning(
                        "[%s] ⚠️ %s HTTP %d — %s",
                        agent_name, current_model, exc.status_code, str(exc)[:120],
                    )
                    break  # non-retryable status; move to next model

            except RateLimitError as exc:
                last_error = exc
                limiter.exhaust(current_model)
                logger.warning("[%s] ⚡ %s RateLimitError — exhausted window", agent_name, current_model)
                break

            except Exception as exc:
                logger.error("[%s] ❌ Unexpected error on %s: %s", agent_name, current_model, exc)
                raise

    raise RuntimeError(
        f"[{agent_name}] All models exhausted. Tried: {tried}. Last error: {last_error}"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _flatten_messages(messages: list[dict[str, str]]) -> str:
    """Collapse chat messages into a single prompt for the /ask endpoint.

    The /ask endpoint (claude -p) takes one `query` string, so the system
    instructions and the user request are concatenated, system first.
    """
    system_parts = [m["content"] for m in messages if m.get("role") == "system"]
    other_parts = [m["content"] for m in messages if m.get("role") != "system"]
    blocks = []
    if system_parts:
        blocks.append("\n\n".join(system_parts))
    if other_parts:
        blocks.append("\n\n".join(other_parts))
    return "\n\n---\n\n".join(blocks)


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


def repair_json(text: str) -> str:
    """
    Fix common LLM JSON output issues and return a parseable string.

    Handles:
    - Literal (unescaped) newlines/tabs inside string values  → \\n / \\t
    - Trailing commas before ] or }
    - Truncated output: closes open strings, brackets, braces
    """
    # Pass 1: escape literal control characters inside JSON string values
    out: list[str] = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            out.append(ch)
            escape_next = False
        elif ch == "\\" and in_string:
            out.append(ch)
            escape_next = True
        elif ch == '"':
            in_string = not in_string
            out.append(ch)
        elif in_string:
            if ch == "\n":
                out.append("\\n")
            elif ch == "\r":
                out.append("\\r")
            elif ch == "\t":
                out.append("\\t")
            else:
                out.append(ch)
        else:
            out.append(ch)

    text = "".join(out)

    # Pass 2: remove trailing commas before ] or }
    import re
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Pass 3: close any unterminated string, then close open brackets/braces
    in_str = False
    esc = False
    depth: list[str] = []
    for ch in text:
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if not in_str:
            if ch in "{[":
                depth.append("}" if ch == "{" else "]")
            elif ch in "}]" and depth:
                depth.pop()

    if in_str:
        text += '"'
    while depth:
        text += depth.pop()

    return text


def parse_json_robust(raw: str, label: str = "agent") -> dict:
    """
    extract_json → json.loads, with repair_json fallback.
    Raises ValueError if both attempts fail.
    """
    import json as _json
    extracted = extract_json(raw)
    try:
        return _json.loads(extracted)
    except _json.JSONDecodeError as first_err:
        logger.warning("[%s] JSON parse failed (%s) — attempting repair", label, first_err)
        try:
            return _json.loads(repair_json(extracted))
        except _json.JSONDecodeError as second_err:
            logger.error("[%s] JSON repair also failed: %s", label, second_err)
            raise ValueError(f"Unparseable JSON from {label}: {second_err}") from second_err


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
