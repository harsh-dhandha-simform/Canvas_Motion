from typing import TypedDict, Any, Optional


class PipelineState(TypedDict):
    topic: str
    duration_seconds: int            # user-requested length; Timing scales scenes to fit

    syllabus: Optional[dict[str, Any]]   # Researcher: subtopics, prereqs, depth
    plan: Optional[dict[str, Any]]       # Director: scenes[] blueprint (layout, panels, covers) + theme
    script: Optional[dict[str, Any]]     # Scriptwriter: content panel data + narration  (parallel)
    story: Optional[dict[str, Any]]      # Visual Architect: visual panel data + transitions (parallel)

    scenes: Optional[list[dict[str, Any]]]   # merged scenes with full panels[{area,type,data}]
    captions: Optional[list[dict[str, Any]]] # on-screen caption timeline
    video_script: Optional[dict[str, Any]]   # final validated VideoScript JSON (frontend props)

    validation_report: Optional[dict[str, Any]]
    errors: list[str]
    model_used: Optional[str]
    fallback_triggered: bool
