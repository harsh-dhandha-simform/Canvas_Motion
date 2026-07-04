"""LLM helper for the engine agents. Reproduces the reference
`chat_completion(...response_model=...)` signature so ported agent code changes
only its import line, but routes through eduvideo's LLMClient (custom Claude proxy
primary + Azure fallback) and eduvideo's Langfuse span() tracing.

extract_json / repair_json / parse_json_robust are copied verbatim from the
reference backend/utils/api.py (pure, no Groq deps). The Groq client, rate-limiter
walk, and call_llm are deliberately NOT ported."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.clients.llm import LLMClient
from app.clients.tracing import span

logger = logging.getLogger(__name__)

_client = LLMClient()


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    agent_name: str = "agent",
    response_model: Any = None,
) -> str:
    """Flatten OpenAI-style messages, inject the response_model JSON Schema (as the
    reference does), and call eduvideo's LLMClient in json_mode. `temperature`,
    `model`, `max_tokens` are accepted for signature compatibility but are inert on
    the custom-proxy path (the proxy is driven by config.llm.thinking/effort)."""
    system = "\n\n".join(m["content"] for m in messages if m.get("role") == "system")
    user = "\n\n".join(m["content"] for m in messages if m.get("role") != "system")
    if response_model is not None:
        system += (
            "\n\n## OUTPUT FORMAT\nReturn ONLY raw JSON matching this JSON Schema "
            "(no prose, no markdown fences):\n" + json.dumps(response_model.model_json_schema())
        )
    with span(f"{agent_name}.llm", as_type="generation", input=user, agent=agent_name) as obs:
        answer = _client.complete(system, user, json_mode=True)
        obs.update(output=answer)
    return answer


def extract_json(text: str) -> str:
    """Extract a JSON substring from a text block, handling markdown codeblocks and extra prose."""
    markdown_json = re.search(r"```(?:json)?\s*([{\[].*?[}\]])\s*```", text, re.DOTALL)
    if markdown_json:
        return markdown_json.group(1).strip()

    first_brace = min([pos for pos in [text.find("{"), text.find("[")] if pos != -1], default=-1)
    last_brace = max([pos for pos in [text.rfind("}"), text.rfind("]")] if pos != -1], default=-1)

    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1].strip()

    return text.strip()


def repair_json(text: str) -> str:
    """Fix common LLM JSON output issues and return a parseable string.

    Handles: literal newlines/tabs inside strings; trailing commas; truncated output
    (closes open strings, brackets, braces)."""
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
    text = re.sub(r",\s*([}\]])", r"\1", text)

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
    """extract_json → json.loads, with repair_json fallback. Raises ValueError if both fail."""
    extracted = extract_json(raw)
    try:
        return json.loads(extracted)
    except json.JSONDecodeError as first_err:
        logger.warning("[%s] JSON parse failed (%s) — attempting repair", label, first_err)
        try:
            return json.loads(repair_json(extracted))
        except json.JSONDecodeError as second_err:
            logger.error("[%s] JSON repair also failed: %s", label, second_err)
            raise ValueError(f"Unparseable JSON from {label}: {second_err}") from second_err
