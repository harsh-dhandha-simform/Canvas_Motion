"""
backend/models/video_script.py

Pydantic models mirroring the VideoScript JSON contract.
Used for structured output validation from the assembler LLM call.
"""
from __future__ import annotations
from typing import Annotated, Any, Literal, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Per-component data models — must mirror frontend Zod schemas exactly
# ---------------------------------------------------------------------------

class AnimatedTitleData(BaseModel):
    title: str
    subtitle: Optional[str] = None
    accentColor: Optional[str] = None
    align: Optional[Literal["left", "center"]] = None


class ComparisonCardData(BaseModel):
    title: str
    pros: list[str]
    cons: list[str]
    accentColor: Optional[str] = None
    visibleCount: Optional[int] = None


class BulletListData(BaseModel):
    title: str
    items: list[str]
    accentColor: Optional[str] = None
    numbered: Optional[bool] = None
    align: Optional[Literal["left", "center"]] = None


class StepFlowData(BaseModel):
    title: str
    steps: list[str]
    accentColor: Optional[str] = None


class StatCalloutData(BaseModel):
    title: str
    value: float
    suffix: Optional[str] = None
    description: Optional[str] = None
    accentColor: Optional[str] = None


class NodeMetrics(BaseModel):
    cpu: Optional[str] = None
    ram: Optional[str] = None


class ArchNode(BaseModel):
    id: str
    type: Literal["server", "loadBalancer", "database", "client"]
    x: float
    y: float
    label: Optional[str] = None
    metrics: Optional[NodeMetrics] = None


class ArchConnection(BaseModel):
    fromId: str
    toId: str
    type: Literal["stream", "arrow"]
    label: Optional[str] = None


class ArchitectureDiagramData(BaseModel):
    title: str
    nodes: Optional[list[ArchNode]] = None
    connections: Optional[list[ArchConnection]] = None
    accentColor: Optional[str] = None


class CodeSnippet(BaseModel):
    code: str
    language: str


class SplitScreenData(BaseModel):
    title: str
    subtitle: Optional[str] = None
    accentColor: Optional[str] = None
    bullets: Optional[list[str]] = None
    codeSnippet: Optional[CodeSnippet] = None
    mediaUrl: Optional[str] = None


class TypewriterTextData(BaseModel):
    lines: list[str]
    accentColor: Optional[str] = None
    fontSize: Optional[int] = None
    align: Optional[Literal["left", "center", "right"]] = None
    charPerFrame: Optional[float] = None
    showCursor: Optional[bool] = None


class TimelineEvent(BaseModel):
    year: str
    label: str
    description: Optional[str] = None
    highlight: Optional[bool] = None


class TimelineFlowData(BaseModel):
    title: Optional[str] = None
    events: list[TimelineEvent]
    accentColor: Optional[str] = None
    direction: Optional[Literal["vertical", "horizontal"]] = None


class QuoteCardData(BaseModel):
    quote: str
    author: Optional[str] = None
    role: Optional[str] = None
    accentColor: Optional[str] = None
    highlightWords: Optional[list[str]] = None
    align: Optional[Literal["left", "center"]] = None


class CodeBlockData(BaseModel):
    title: Optional[str] = None
    code: str
    language: Optional[str] = None
    accentColor: Optional[str] = None
    revealMode: Optional[Literal["lines", "chars", "instant"]] = None
    highlightLines: Optional[list[int]] = None
    fontSize: Optional[int] = None


class ColumnDef(BaseModel):
    heading: str
    points: list[str]
    color: Optional[str] = None
    icon: Optional[str] = None


class TwoColumnLayoutData(BaseModel):
    title: Optional[str] = None
    left: ColumnDef
    right: ColumnDef
    accentColor: Optional[str] = None
    dividerLabel: Optional[str] = None


class BarDef(BaseModel):
    label: str
    value: float
    color: Optional[str] = None
    sublabel: Optional[str] = None


class BarChartData(BaseModel):
    title: Optional[str] = None
    bars: list[BarDef]
    accentColor: Optional[str] = None
    showValues: Optional[bool] = None
    layout: Optional[Literal["vertical", "horizontal"]] = None


# ---------------------------------------------------------------------------
# Discriminated union Scene model
# ---------------------------------------------------------------------------

TransitionType = Literal["fade", "slideLeft", "slideUp", "zoom", "none"]


class AnimatedTitleScene(BaseModel):
    id: str
    type: Literal["AnimatedTitle"]
    duration_frames: int
    transition: TransitionType
    data: AnimatedTitleData


class ComparisonCardScene(BaseModel):
    id: str
    type: Literal["ComparisonCard"]
    duration_frames: int
    transition: TransitionType
    data: ComparisonCardData


class BulletListScene(BaseModel):
    id: str
    type: Literal["BulletList"]
    duration_frames: int
    transition: TransitionType
    data: BulletListData


class StepFlowScene(BaseModel):
    id: str
    type: Literal["StepFlow"]
    duration_frames: int
    transition: TransitionType
    data: StepFlowData


class StatCalloutScene(BaseModel):
    id: str
    type: Literal["StatCallout"]
    duration_frames: int
    transition: TransitionType
    data: StatCalloutData


class ArchitectureDiagramScene(BaseModel):
    id: str
    type: Literal["ArchitectureDiagram"]
    duration_frames: int
    transition: TransitionType
    data: ArchitectureDiagramData


class SplitScreenScene(BaseModel):
    id: str
    type: Literal["SplitScreen"]
    duration_frames: int
    transition: TransitionType
    data: SplitScreenData


class TypewriterTextScene(BaseModel):
    id: str
    type: Literal["TypewriterText"]
    duration_frames: int
    transition: TransitionType
    data: TypewriterTextData


class TimelineFlowScene(BaseModel):
    id: str
    type: Literal["TimelineFlow"]
    duration_frames: int
    transition: TransitionType
    data: TimelineFlowData


class QuoteCardScene(BaseModel):
    id: str
    type: Literal["QuoteCard"]
    duration_frames: int
    transition: TransitionType
    data: QuoteCardData


class CodeBlockScene(BaseModel):
    id: str
    type: Literal["CodeBlock"]
    duration_frames: int
    transition: TransitionType
    data: CodeBlockData


class TwoColumnLayoutScene(BaseModel):
    id: str
    type: Literal["TwoColumnLayout"]
    duration_frames: int
    transition: TransitionType
    data: TwoColumnLayoutData


class BarChartScene(BaseModel):
    id: str
    type: Literal["BarChart"]
    duration_frames: int
    transition: TransitionType
    data: BarChartData


Scene = Annotated[
    Union[
        AnimatedTitleScene,
        ComparisonCardScene,
        BulletListScene,
        StepFlowScene,
        StatCalloutScene,
        ArchitectureDiagramScene,
        SplitScreenScene,
        TypewriterTextScene,
        TimelineFlowScene,
        QuoteCardScene,
        CodeBlockScene,
        TwoColumnLayoutScene,
        BarChartScene,
    ],
    Field(discriminator="type"),
]


# ---------------------------------------------------------------------------
# Theme
# ---------------------------------------------------------------------------

class Theme(BaseModel):
    primary: str
    secondary: str
    accent: str
    background: str
    font: str


# ---------------------------------------------------------------------------
# Top-level VideoScript
# ---------------------------------------------------------------------------

class VideoScript(BaseModel):
    title: str
    fps: Literal[30] = 30
    width: Literal[1920] = 1920
    height: Literal[1080] = 1080
    theme: Theme
    scenes: list[Scene]

    def total_frames(self) -> int:
        return sum(s.duration_frames for s in self.scenes)
