"""Shared enums reused across every artifact schema (MASTER_CONTEXT.md §5, §5.2)."""

from __future__ import annotations

from enum import Enum


class Template(str, Enum):
    TITLE = "TitleScene"
    DEFINITION = "DefinitionScene"
    BULLET_LIST = "BulletListScene"
    DIAGRAM = "DiagramScene"
    CODE = "CodeScene"
    COMPARISON = "ComparisonScene"
    CHART = "ChartScene"
    QUIZ = "QuizScene"
    RECAP = "RecapScene"
    OUTRO = "OutroScene"


class AnimationPreset(str, Enum):
    FADE_IN = "fadeIn"
    SLIDE_UP = "slideUp"
    POP_IN = "popIn"
    NONE = "none"


class DiagramType(str, Enum):
    FLOW = "flow"
    SEQUENCE = "sequence"
    ARCHITECTURE = "architecture"
    STATE = "state"
    TREE = "tree"
    GRAPH = "graph"
    STACK = "stack"
    TIMELINE = "timeline"


class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"


class CodeLanguage(str, Enum):
    PYTHON = "python"
    JS = "js"
    TS = "ts"
    JAVA = "java"
    C = "c"
    CPP = "cpp"
    GO = "go"
    RUST = "rust"
    SQL = "sql"
    BASH = "bash"
    PSEUDOCODE = "pseudocode"


class SceneType(str, Enum):
    HOOK = "hook"
    DEFINITION = "definition"
    EXPLANATION = "explanation"
    EXAMPLE = "example"
    COMPARISON = "comparison"
    RECAP = "recap"
    QUIZ = "quiz"
    OUTRO = "outro"


class InteractionType(str, Enum):
    STEP_THROUGH = "step_through"
    CODE_PLAYGROUND = "code_playground"
    PARAM_EXPLORER = "param_explorer"
    DIAGRAM_EXPLORE = "diagram_explore"
    QUIZ = "quiz"
    DATA_STRUCTURE = "data_structure"
    FLASHCARDS = "flashcards"
    CUSTOM = "custom"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    COMPLETED = "completed"
