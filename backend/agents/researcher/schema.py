"""
backend/schemas/researcher.py

Pydantic models for the Researcher agent's output (the "syllabus").
Validated immediately after parse_json_robust() in researcher_node.
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class Subtopic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    teaching_goal: str
    depth_notes: str = ""
    real_systems: list[str] = Field(default_factory=list)
    must_cover: bool = True


class Syllabus(BaseModel):
    model_config = ConfigDict(extra="ignore")

    topic: str
    one_line: str = ""
    depth_level: Literal["introductory", "intermediate", "advanced"] = "intermediate"
    prerequisites: list[str] = Field(default_factory=list)
    subtopics: list[Subtopic] = Field(default_factory=list)
    misconceptions: list[str] = Field(default_factory=list)
    key_terms: list[str] = Field(default_factory=list)
