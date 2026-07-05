"""
backend/test_azure.py — smoke test for the Azure OpenAI backend.

Verifies the AZURE_OPENAI_* env vars + connectivity by sending one chat request
through utils/azure_client.py (independent of LLM_BACKEND). Run from backend/:

    python test_azure.py

Requires the openai package (added to pyproject) and a filled-in .env.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (  # noqa: E402
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION,
)


def main() -> int:
    if not (AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT):
        print("❌ Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in .env first.")
        return 1

    print(f"→ endpoint={AZURE_OPENAI_ENDPOINT}")
    print(f"→ deployment={AZURE_OPENAI_DEPLOYMENT_NAME}  api_version={AZURE_OPENAI_API_VERSION}")

    from utils.azure_client import azure_chat

    # 1) plain text
    answer = azure_chat(
        [
            {"role": "system", "content": "You are a terse assistant."},
            {"role": "user", "content": "Reply with exactly: Azure OpenAI is working."},
        ],
        temperature=0.0,
        agent_name="azure-smoketest",
    )
    print("\n✅ Text response:\n" + answer)

    # 2) JSON mode (what the pipeline agents rely on)
    from pydantic import BaseModel

    class Ping(BaseModel):
        ok: bool
        service: str

    js = azure_chat(
        [{"role": "user", "content": "Return ok=true and service='azure' as JSON."}],
        temperature=0.0,
        response_model=Ping,
        agent_name="azure-smoketest",
    )
    print("\n✅ JSON response:\n" + js)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
