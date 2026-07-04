"""input.json — the user-facing request that kicks off a pipeline run."""

from __future__ import annotations

from pydantic import BaseModel


class JobInput(BaseModel):
    topic: str
    audience: str | None = None
    durationSec: int | None = None
    language: str = "English"
    tone: str | None = None
    context: str | None = None
    includeQuiz: bool = False
    aspectRatio: str = "16:9"
