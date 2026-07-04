"""content_analysis.json — Content Understanding output, including the ordered
concept list that seeds the concept spine (MASTER_CONTEXT.md §2.1). Concepts here
carry no timing yet; that's added later in concepts.py.
"""

from __future__ import annotations

from pydantic import BaseModel


class Concept(BaseModel):
    id: str
    title: str
    order: int
    description: str


class ContentAnalysis(BaseModel):
    topic: str
    learningObjective: str
    keyPoints: list[str]
    keywords: list[str]
    commonMisconceptions: list[str]
    difficulty: str | None = None
    prerequisites: list[str] | None = None
    technicalDetails: list[str] | None = None
    visualOpportunities: list[str] | None = None
    concepts: list[Concept]
