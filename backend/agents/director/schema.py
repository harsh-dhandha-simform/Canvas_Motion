"""
backend/schemas/director.py

Pydantic models for the Director agent's output (the scene blueprint / "plan").
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class Theme(BaseModel):
    model_config = ConfigDict(extra="ignore")

    background: str = "#030711"
    primary: str = "#6366f1"
    secondary: str = "#10b981"
    accent: str = "#f59e0b"
    font: str = "Inter"


class PanelBlueprint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    area: str    # "panel" | "left" | "right" | "main" | "sidebar"
    type: str    # component name e.g. "BulletList"


class SceneBlueprint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    index: int
    role: Literal["hook", "prerequisite", "core", "deep-dive", "tradeoff", "synthesis", "outro"]
    layout: str
    title: str
    subtitle: str = ""
    covers: list[str] = Field(default_factory=list)  # subtopic ids
    panels: list[PanelBlueprint] = Field(default_factory=list)


class DirectorPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: Theme = Field(default_factory=Theme)
    scenes: list[SceneBlueprint] = Field(default_factory=list)
