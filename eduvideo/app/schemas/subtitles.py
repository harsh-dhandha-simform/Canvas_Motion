"""subtitles.json — baked-in transcript entries. `Subtitle` is also embedded directly
in video_plan.json's `subtitles` list (MASTER_CONTEXT.md §6.1).
"""

from __future__ import annotations

from pydantic import BaseModel


class Subtitle(BaseModel):
    start: float
    end: float
    text: str
    highlight: list[str] = []


class Subtitles(BaseModel):
    items: list[Subtitle]
