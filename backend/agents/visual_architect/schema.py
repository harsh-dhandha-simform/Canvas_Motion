"""
backend/schemas/visual_architect.py

Pydantic models for the Visual Architect agent's output.
Mirrors ScriptOutput but for visual panels + transitions.
"""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


TransitionType = Literal["fade", "slideLeft", "slideUp", "zoom", "none"]


class StoryScene(BaseModel):
    model_config = ConfigDict(extra="ignore")

    index: int
    transition: TransitionType = "slideLeft"
    panels: dict[str, dict[str, Any]] = Field(default_factory=dict)


class StoryOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scenes: list[StoryScene] = Field(default_factory=list)
