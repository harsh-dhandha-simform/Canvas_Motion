"""
backend/utils/ask_client.py — client for the self-hosted Claude /ask endpoint.

POSTs to ASK_URL (ask_server.py, which shells out to the Claude Code CLI) with
Bearer auth and a JSON body {query, model, thinking, effort}, and returns the
`answer` field of the response.

This is the LLM transport used by every agent when LLM_BACKEND="ask".
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
        # Surface what the `claude` CLI actually said. ask_server returns its stdout in
        # `answer` (usually {"raw_output": ...}) and stderr separately — the real error is
        # often on stdout, so include all of it (truncated) instead of a bare "None".
        answer = data.get("answer")
        if isinstance(answer, dict):
            answer = answer.get("raw_output", answer)
        detail = data.get("stderr") or data.get("error") or answer or "(no stderr/stdout)"
        raise RuntimeError(
            f"[{agent_name}] /ask returned failure (exit={data.get('exit_code')}): {str(detail)[:1500]}"
        )

    raw_answer = data.get("answer")
    if isinstance(raw_answer, dict):
        if list(raw_answer.keys()) == ["raw_output"]:
            answer = raw_answer["raw_output"].strip()
        else:
            import json
            answer = json.dumps(raw_answer).strip()
    else:
        answer = (raw_answer or "").strip()
        
    if not answer:
        raise RuntimeError(f"[{agent_name}] /ask returned empty answer")

    logger.info("[%s] ✅ /ask answer chars=%d (%.1fs)",
                agent_name, len(answer), data.get("duration_seconds", 0))
    return answer
