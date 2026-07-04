"""interactions.json — the AI<->player boundary, the right-hand interaction panel
(MASTER_CONTEXT.md §5.2, §6.3). Mirrors the per-template prop validation in
video_plan.py: each widget `type` maps to a prop model, and `Interaction` validates
(and normalizes) `props` against it. `custom` is the sandboxed fallback and instead
requires `custom.code`.
"""

from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.schemas.enums import CodeLanguage, DiagramType, InteractionType
from app.schemas.video_plan import DiagramEdge, DiagramNode


class StepThroughStep(BaseModel):
    label: str
    detail: str


class StepThroughProps(BaseModel):
    steps: list[StepThroughStep]


class CodePlaygroundProps(BaseModel):
    language: CodeLanguage
    initialCode: str
    expectedOutput: str | None = None


class ParamExplorerParam(BaseModel):
    name: str
    label: str
    min: float
    max: float
    step: float = 1.0
    default: float


class ParamExplorerProps(BaseModel):
    params: list[ParamExplorerParam]
    visualization: str


class DiagramExploreProps(BaseModel):
    diagramType: DiagramType
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]
    labels: list[str] = []
    caption: str | None = None


class QuizWidgetProps(BaseModel):
    question: str
    options: list[str]
    answer: str

    @model_validator(mode="after")
    def _answer_in_options(self) -> "QuizWidgetProps":
        if self.answer not in self.options:
            raise ValueError("answer must be one of options")
        return self


class DataStructureProps(BaseModel):
    structureType: str
    initialState: dict = {}


class FlashcardsCard(BaseModel):
    front: str
    back: str


class FlashcardsProps(BaseModel):
    cards: list[FlashcardsCard]


class CustomCode(BaseModel):
    entry: str
    code: str


WIDGET_PROP_MODELS: dict[InteractionType, type[BaseModel]] = {
    InteractionType.STEP_THROUGH: StepThroughProps,
    InteractionType.CODE_PLAYGROUND: CodePlaygroundProps,
    InteractionType.PARAM_EXPLORER: ParamExplorerProps,
    InteractionType.DIAGRAM_EXPLORE: DiagramExploreProps,
    InteractionType.QUIZ: QuizWidgetProps,
    InteractionType.DATA_STRUCTURE: DataStructureProps,
    InteractionType.FLASHCARDS: FlashcardsProps,
}


class Interaction(BaseModel):
    concept_id: str
    type: InteractionType
    title: str
    props: dict = {}
    custom: CustomCode | None = None

    @model_validator(mode="after")
    def _validate_props(self) -> "Interaction":
        if self.type == InteractionType.CUSTOM:
            if self.custom is None or not self.custom.code:
                raise ValueError("type=custom requires custom.code")
            return self
        prop_model = WIDGET_PROP_MODELS[self.type]
        self.props = prop_model.model_validate(self.props).model_dump(by_alias=True)
        return self


class Interactions(BaseModel):
    interactions: list[Interaction]
