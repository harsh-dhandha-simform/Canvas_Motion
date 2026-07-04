"""script.json — narration script, each section tagged with a concept_id."""

from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.schemas.enums import SceneType


class ScriptSection(BaseModel):
    type: SceneType
    concept_id: str
    narration: str
    question: str | None = None
    options: list[str] | None = None
    answer: str | None = None

    @model_validator(mode="after")
    def _quiz_fields_present(self) -> "ScriptSection":
        if self.type == SceneType.QUIZ:
            if not self.question or not self.options or self.answer is None:
                raise ValueError("quiz sections require question, options, and answer")
            if self.answer not in self.options:
                raise ValueError("answer must be one of options")
        return self


class Script(BaseModel):
    title: str
    sections: list[ScriptSection]
