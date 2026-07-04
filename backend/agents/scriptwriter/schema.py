"""
backend/schemas/scriptwriter.py

Pydantic models for the Scriptwriter agent's output.
`panels` is a dict keyed by grid area name ("left", "right", "main", etc.),
whose value is the component's data dict (free-form — validated by the
component's JSON Schema in the Validator node, not here).

NOTE: There is NO `index` field here. Scenes are matched positionally
(by enumerate order) in merge_node, not by index. The index field caused
all scenes to silently collapse to index=0.
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class ScriptScene(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # No `index` field — merge_node uses enumerate position, not scene index.
    narration: str = ""
    panels: dict[str, dict[str, Any]] = Field(default_factory=dict)


class ScriptOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scenes: list[ScriptScene]
