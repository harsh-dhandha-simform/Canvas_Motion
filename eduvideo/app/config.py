"""Loads .env (secrets) + config.yaml (non-secret settings) into one typed Settings object."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config.yaml"


class VideoConfig(BaseModel):
    width: int = 1920
    height: int = 1080
    fps: int = 30
    theme: str = "education_clean"
    primary_color: str = "#22c55e"
    background_color: str = "#f8fafc"
    font_family: str = "Inter"


class LLMConfig(BaseModel):
    model: str = "sonnet"
    thinking: str = "disabled"
    effort: str = "medium"
    timeout_seconds: float = 60.0
    fallback_model: str = "gpt-4o"


class TTSConfig(BaseModel):
    timeout_seconds: float = 30.0


class JobsConfig(BaseModel):
    dir: str = "jobs"


class YamlConfig(BaseModel):
    video: VideoConfig = VideoConfig()
    llm: LLMConfig = LLMConfig()
    tts: TTSConfig = TTSConfig()
    jobs: JobsConfig = JobsConfig()


def _load_yaml_config() -> YamlConfig:
    if not CONFIG_PATH.exists():
        return YamlConfig()
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    return YamlConfig(**raw)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # Custom LLM (primary, Claude-backed proxy)
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None

    # Azure OpenAI GPT-4o (fallback)
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-08-01-preview"

    # Deepgram TTS
    deepgram_api_key: str | None = None

    # Langfuse (optional)
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str = "https://cloud.langfuse.com"

    config: YamlConfig = Field(default_factory=_load_yaml_config)

    @property
    def custom_llm_configured(self) -> bool:
        return bool(self.llm_base_url and self.llm_api_key)

    @property
    def azure_configured(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)

    @property
    def deepgram_configured(self) -> bool:
        return bool(self.deepgram_api_key)

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
