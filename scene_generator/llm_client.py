"""Thin wrapper around Azure OpenAI (GPT-4o) for generating VisualizationSpec
JSON. Uses JSON mode (response_format=json_object) so the model is
constrained to emit valid JSON rather than prose-wrapped output.
"""

import os

from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv()

_REQUIRED_ENV_VARS = (
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT_NAME",
    "AZURE_OPENAI_API_VERSION",
)


class LLMConfigError(RuntimeError):
    pass


def _get_client() -> AzureOpenAI:
    missing = [name for name in _REQUIRED_ENV_VARS if not os.environ.get(name)]
    if missing:
        raise LLMConfigError(
            f"Missing required env var(s): {', '.join(missing)}. "
            "Copy .env.example to .env and fill them in."
        )

    return AzureOpenAI(
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version=os.environ["AZURE_OPENAI_API_VERSION"],
    )


def ask_json(system_prompt: str, user_prompt: str) -> str:
    """Returns the raw JSON text from the model (already validated as
    syntactically-valid JSON by the API's json_object mode)."""

    client = _get_client()
    deployment = os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"]

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    return response.choices[0].message.content
