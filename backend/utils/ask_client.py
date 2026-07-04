"""
backend/utils/ask_client.py — client for the custom self-hosted LLM endpoint.

Configured via environment variables (resolved in config.py):
  CUSTOM_LLM_URL    — endpoint URL  (e.g. http://172.16.5.228:8080/ask)
  CUSTOM_LLM_TOKEN  — Bearer auth token
  ASK_MODEL         — model name to pass to the server (e.g. "sonnet")
  ASK_THINKING      — thinking mode ("enabled" | "disabled" | "adaptive")
  ASK_EFFORT        — effort level  ("low" | "medium" | "high" | "max")

Legacy fallbacks ASK_URL / ASK_API_KEY are also accepted for compatibility.
This transport is active when LLM_BACKEND="ask" in the environment.
"""

import logging

import requests

from config import (
    ASK_URL,
    ASK_API_KEY,
    ASK_MODEL,
    ASK_THINKING,
    ASK_EFFORT,
    ASK_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)


def ask(
    query: str,
    *,
    model: str | None = None,
    thinking: str | None = None,
    effort: str | None = None,
    timeout: int | None = None,
    agent_name: str = "agent",
) -> str:
    """Send a single prompt to the /ask endpoint and return the answer text.

    Raises RuntimeError on transport failure or a non-success response.
    """
    body = {
        "query": query,
        "model": model or ASK_MODEL,
        "thinking": thinking or ASK_THINKING,
        "effort": effort or ASK_EFFORT,
    }
    headers = {
        "Authorization": f"Bearer {ASK_API_KEY}",
        "Content-Type": "application/json",
    }

    logger.info("[%s] → /ask model=%s effort=%s qlen=%d",
                agent_name, body["model"], body["effort"], len(query))

    try:
        resp = requests.post(
            ASK_URL, json=body, headers=headers,
            timeout=timeout or ASK_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"[{agent_name}] /ask request failed: {exc}") from exc

    if resp.status_code != 200:
        raise RuntimeError(
            f"[{agent_name}] /ask HTTP {resp.status_code}: {resp.text[:300]}"
        )

    data = resp.json()
    if not data.get("success"):
        err_detail = data.get('stderr') or data.get('error') or data.get('answer') or "Unknown error"
        raise RuntimeError(
            f"[{agent_name}] /ask returned failure: {err_detail}"
        )

    answer = (data.get("answer") or "").strip()
    if not answer:
        raise RuntimeError(f"[{agent_name}] /ask returned empty answer")

    logger.info("[%s] ✅ /ask answer chars=%d (%.1fs)",
                agent_name, len(answer), data.get("duration_seconds", 0))
    return answer
