"""FastAPI entrypoint (thin). Pipeline routes are added in later phases."""

from fastapi import FastAPI

from app.clients.llm import LLMClient
from app.clients.tts import TTSClient
from app.config import get_settings

app = FastAPI(title="EduVideo")


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "llm": LLMClient().health(),
        "tts": TTSClient().health(),
        "langfuse": {"enabled": settings.langfuse_enabled},
    }
