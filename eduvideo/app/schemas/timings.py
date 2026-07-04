"""timings.json — Deepgram voiceover output: audio file reference + segment timings."""

from __future__ import annotations

from pydantic import BaseModel


class Segment(BaseModel):
    start: float
    end: float
    text: str
    estimated: bool
    section_index: int


class Timings(BaseModel):
    audioFile: str
    durationSec: float
    segments: list[Segment]
