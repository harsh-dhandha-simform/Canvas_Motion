"""storyboard.json — scene plan, each scene tagged with a concept_id. `props` is
validated (and normalized) against a per-`template` prop model, reusing the same
mapping as video_plan.py's `PlanScene` (Phase 5).
"""

from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.schemas.enums import AnimationPreset, Template
from app.schemas.video_plan import TEMPLATE_PROP_MODELS


class StoryboardScene(BaseModel):
    id: str
    concept_id: str
    template: Template
    estDuration: float
    narration: str
    onScreenText: str | None = None
    props: dict
    animation: AnimationPreset

    @model_validator(mode="after")
    def _validate_props(self) -> "StoryboardScene":
        prop_model = TEMPLATE_PROP_MODELS[self.template]
        self.props = prop_model.model_validate(self.props).model_dump(by_alias=True)
        return self


class Storyboard(BaseModel):
    scenes: list[StoryboardScene]
