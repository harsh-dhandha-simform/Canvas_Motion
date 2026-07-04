"""concepts.json — the concept spine WITH real time windows (MASTER_CONTEXT.md §2.1,
§6.2). Produced by the Concept Spine stage in Phase 8; this is the shared backbone
that both video_plan.json and interactions.json key off.
"""

from __future__ import annotations

from pydantic import BaseModel


class ConceptWindow(BaseModel):
    id: str
    title: str
    order: int
    description: str
    start: float
    end: float


class Concepts(BaseModel):
    concepts: list[ConceptWindow]
    totalDurationSec: float
