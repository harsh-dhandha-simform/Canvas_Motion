"""
backend/models/video_script.py

Pydantic models for the multi-panel VideoScript format.

Each Scene has:
  - layout: one of 5 grid layout names
  - title / subtitle: shown in the header bar (for title-* layouts)
  - panels: list of {area, type, data} — one per grid area

Layouts and their areas:
  full                → "panel" (single full-screen panel)
  left-right          → "left", "right"
  title-content       → "main"   (header rendered from scene.title)
  title-left-right    → "left", "right"
  title-main-sidebar  → "main", "sidebar"
"""
from __future__ import annotations
import typing
from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field, model_validator


class _NullSafeBase(BaseModel):
    """Coerce JSON null → [] for list fields before Pydantic type validation."""

    @model_validator(mode="before")
    @classmethod
    def _coerce_null_arrays(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for name, field_info in cls.model_fields.items():
            if data.get(name) is not None:
                continue
            ann = field_info.annotation
            origin = typing.get_origin(ann)
            if origin is list:
                data[name] = []
            elif origin is Union:
                args = typing.get_args(ann)
                if any(typing.get_origin(a) is list for a in args):
                    data[name] = []
        return data


# ---------------------------------------------------------------------------
# Panel — one component in one area of a scene's grid
# ---------------------------------------------------------------------------

class Panel(BaseModel):
    area: str   # "panel" | "left" | "right" | "main" | "sidebar"
    type: str   # one of the 13 component names
    size_ratio: float = 1.0
    delay_frames: Optional[int] = None
    data: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Scene — a multi-panel composition
# ---------------------------------------------------------------------------

VALID_LAYOUTS = frozenset([
    "full",                # 1920×1080, area="panel"
    "left-right",          # 960×1080 each, areas="left","right"
    "title-content",       # header + 1920×900 main, area="main"
    "title-left-right",    # header + 960×900 each, areas="left","right"
    "title-main-sidebar",  # header + 1248×900 main + 672×900 sidebar
])

TransitionType = Literal["fade", "slideLeft", "slideUp", "zoom", "none"]


class Scene(_NullSafeBase):
    id: str
    layout: str = "full"
    title: str = ""
    subtitle: Optional[str] = None
    duration_frames: int
    transition: TransitionType = "fade"
    narration: str = ""               # spoken/on-screen explanation for this scene
    panels: list[Panel] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if data.get("layout") not in VALID_LAYOUTS:
            data["layout"] = "full"
        return data


# ---------------------------------------------------------------------------
# Theme
# ---------------------------------------------------------------------------

class Theme(_NullSafeBase):
    primary: str
    secondary: str
    accent: str
    background: str
    font: str


# ---------------------------------------------------------------------------
# VideoScript — top-level document
# ---------------------------------------------------------------------------

class Caption(_NullSafeBase):
    text: str
    startMs: int
    endMs: int
    timestampMs: Optional[int] = None
    confidence: Optional[float] = None


class Voiceover(_NullSafeBase):
    provider: Optional[str] = None       # null until real TTS is wired
    captions: list[Caption] = Field(default_factory=list)


class VideoScript(_NullSafeBase):
    title: str
    fps: int = 30
    width: int = 1920
    height: int = 1080
    theme: Theme
    voiceover: Optional[Voiceover] = None
    audio_url: Optional[str] = None
    scenes: list[Scene]

    def total_frames(self) -> int:
        return sum(s.duration_frames for s in self.scenes)
