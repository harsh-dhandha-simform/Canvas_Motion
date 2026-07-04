"""
backend/schemas/merge.py

Pydantic models for the merged scenes that come out of merge_node.
These are what the Validator and Assembler operate on.
"""
from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class MergedPanel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    area: str
    type: str
    data: dict[str, Any] = Field(default_factory=dict)


class MergedScene(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    layout: str
    title: str
    subtitle: Optional[str] = None
    transition: Literal["fade", "slideLeft", "slideUp", "zoom", "none"] = "fade"
    narration: str = ""
    covers: list[str] = Field(default_factory=list)
    panels: list[MergedPanel] = Field(default_factory=list)
    duration_frames: int = 0    # filled by compute_timings()
    start_frame: int = 0        # filled by compute_timings()
