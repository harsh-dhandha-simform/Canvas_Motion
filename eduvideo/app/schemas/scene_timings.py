"""scene_timings.json — per-scene start/duration reconciled against real voiceover
audio (Phase 7). Feeds the Concept Spine stage.
"""

from __future__ import annotations

from pydantic import BaseModel


class SceneTime(BaseModel):
    id: str
    concept_id: str
    start: float
    duration: float


class SceneTimings(BaseModel):
    scenes: list[SceneTime]
    totalDurationSec: float
