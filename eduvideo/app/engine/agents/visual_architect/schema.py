"""
backend/schemas/visual_architect.py

Pydantic models for the Visual Architect agent's output.

NOTE: There is NO `index` field here. Scenes are matched positionally
(by enumerate order) in merge_node, not by index. The index field caused
all scenes to silently collapse to index=0.
"""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


TransitionType = Literal["fade", "slideLeft", "slideUp", "zoom", "none"]


class StoryScene(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # No `index` field — merge_node uses enumerate position, not scene index.
    transition: str = "slideLeft"
    panels: dict[str, dict[str, Any]] = Field(default_factory=dict)


class StoryOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scenes: list[StoryScene]
