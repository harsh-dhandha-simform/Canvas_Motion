"""video_plan.json — the AI<->renderer boundary (MASTER_CONTEXT.md §6.1). Nothing
here knows about Revideo; the adapter (Phase 10) is the only Revideo-aware code.

`PlanScene.props` is validated (and normalized) against a per-`template` prop model,
mirroring how `Interaction.props` is validated against `type` in interactions.py.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.enums import AnimationPreset, ChartType, CodeLanguage, DiagramType, Template
from app.schemas.subtitles import Subtitle


class VideoStyle(BaseModel):
    theme: str = "dark_matte"
    primaryColor: str = "#7aa2f7"
    backgroundColor: str = "#1a1b26"
    fontFamily: str = "Inter"


class VideoMeta(BaseModel):
    title: str
    width: int = 1920
    height: int = 1080
    fps: int = 30
    durationSec: float
    style: VideoStyle = Field(default_factory=VideoStyle)


class AudioRef(BaseModel):
    voiceoverFile: str


class TitleProps(BaseModel):
    title: str
    subtitle: str | None = None


class DefinitionProps(BaseModel):
    term: str
    definition: str
    keywords: list[str] = []


class BulletListProps(BaseModel):
    heading: str
    items: list[str] = Field(min_length=2)


class DiagramNode(BaseModel):
    id: str
    label: str
    type: str | None = None
    group: str | None = None


class DiagramEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    label: str | None = None
    direction: str | None = None


class DiagramProps(BaseModel):
    diagramType: DiagramType
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]
    labels: list[str] = []
    caption: str | None = None

    @model_validator(mode="after")
    def _edges_reference_existing_nodes(self) -> "DiagramProps":
        node_ids = {node.id for node in self.nodes}
        unknown = sorted(
            {edge.from_ for edge in self.edges if edge.from_ not in node_ids}
            | {edge.to for edge in self.edges if edge.to not in node_ids}
        )
        if unknown:
            raise ValueError(f"diagram edges reference unknown node id(s): {unknown}")
        return self


class CodeStep(BaseModel):
    highlightLines: list[int] = []
    note: str | None = None


class CodeProps(BaseModel):
    language: CodeLanguage
    code: str
    highlightLines: list[int] = []
    caption: str | None = None
    steps: list[CodeStep] = []


class ComparisonSide(BaseModel):
    title: str
    points: list[str]


class ComparisonProps(BaseModel):
    heading: str
    left: ComparisonSide
    right: ComparisonSide


class ChartSeries(BaseModel):
    name: str
    data: list[float]


class ChartProps(BaseModel):
    chartType: ChartType
    series: list[ChartSeries]
    xLabel: str | None = None
    yLabel: str | None = None
    caption: str | None = None


class QuizProps(BaseModel):
    question: str
    options: list[str]
    answer: str

    @model_validator(mode="after")
    def _answer_in_options(self) -> "QuizProps":
        if self.answer not in self.options:
            raise ValueError("answer must be one of options")
        return self


class RecapProps(BaseModel):
    heading: str
    points: list[str]


class OutroProps(BaseModel):
    message: str


TEMPLATE_PROP_MODELS: dict[Template, type[BaseModel]] = {
    Template.TITLE: TitleProps,
    Template.DEFINITION: DefinitionProps,
    Template.BULLET_LIST: BulletListProps,
    Template.DIAGRAM: DiagramProps,
    Template.CODE: CodeProps,
    Template.COMPARISON: ComparisonProps,
    Template.CHART: ChartProps,
    Template.QUIZ: QuizProps,
    Template.RECAP: RecapProps,
    Template.OUTRO: OutroProps,
}


class PlanScene(BaseModel):
    id: str
    concept_id: str
    template: Template
    start: float
    duration: float
    animation: AnimationPreset
    props: dict

    @model_validator(mode="after")
    def _validate_props(self) -> "PlanScene":
        prop_model = TEMPLATE_PROP_MODELS[self.template]
        self.props = prop_model.model_validate(self.props).model_dump(by_alias=True)
        return self


class VideoPlan(BaseModel):
    video: VideoMeta
    audio: AudioRef
    subtitles: list[Subtitle]
    scenes: list[PlanScene]

    @model_validator(mode="after")
    def _scene_durations_match_total(self) -> "VideoPlan":
        total = sum(scene.duration for scene in self.scenes)
        if abs(total - self.video.durationSec) > 0.1:
            raise ValueError(
                f"sum of scene durations ({total}) does not match video.durationSec ({self.video.durationSec})"
            )
        return self
