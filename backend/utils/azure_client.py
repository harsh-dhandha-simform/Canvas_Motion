"""
backend/utils/azure_client.py — Azure OpenAI transport (LLM_BACKEND="azure").

Uses the official openai `AzureOpenAI` SDK. Plays the same role as ask_client.py:
one chat call that returns the raw text answer. Structured output is requested via
response_format=json_object plus a JSON-Schema instruction appended to the system
message — matching how the Groq path in utils/api.py handles `response_model`.
"""

import json
import logging
import re
from typing import Any

from openai import AzureOpenAI

from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION,
)

logger = logging.getLogger(__name__)

# Singleton client, reused across all agent calls.
_client: AzureOpenAI | None = None


def get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            api_key=AZURE_OPENAI_API_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
    return _client


def azure_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    response_model: Any = None,
    agent_name: str = "agent",
) -> str:
    """Send one chat completion to Azure OpenAI and return the answer text.

    Raises RuntimeError on an empty response; SDK/HTTP errors propagate.
    """
    msgs = [dict(m) for m in messages]  # copy so we can safely mutate

    create_kwargs: dict = dict(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,  # Azure: this is the *deployment* name
        messages=msgs,
        temperature=temperature,
    )

    # Structured output: append the schema and ask for a JSON object, mirroring the
    # Groq branch. response_format=json_object requires "json" to appear in the
    # prompt — the schema instruction below satisfies that.
    if response_model is not None:
        schema_str = json.dumps(response_model.model_json_schema(), indent=2)
        schema_instruction = (
            "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "## OUTPUT FORMAT\n"
            "Return ONLY a valid JSON object matching the following JSON Schema:\n"
            f"{schema_str}\n"
        )
        if msgs and msgs[0].get("role") == "system":
            msgs[0]["content"] += schema_instruction
        else:
            msgs.insert(0, {"role": "system", "content": schema_instruction})
        create_kwargs["messages"] = msgs
        create_kwargs["response_format"] = {"type": "json_object"}

    if max_tokens is not None:
        create_kwargs["max_tokens"] = max_tokens

    logger.info(
        "[%s] → azure deployment=%s temp=%s json=%s",
        agent_name, AZURE_OPENAI_DEPLOYMENT_NAME, temperature, response_model is not None,
    )

    response = get_client().chat.completions.create(**create_kwargs)
    content = response.choices[0].message.content or ""
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

    if not content:
        raise RuntimeError(
            f"[{agent_name}] Azure OpenAI returned empty content "
            f"(finish={response.choices[0].finish_reason})"
        )

    usage = response.usage
    logger.info(
        "[%s] ✅ azure — input=%s output=%s total=%s",
        agent_name,
        getattr(usage, "prompt_tokens", "?"),
        getattr(usage, "completion_tokens", "?"),
        getattr(usage, "total_tokens", "?"),
    )
    return content
