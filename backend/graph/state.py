from typing import TypedDict, Any, Optional


class PipelineState(TypedDict):
    topic: str
    brief: Optional[dict[str, Any]]
    script: Optional[dict[str, Any]]
    story: Optional[dict[str, Any]]
    timing: Optional[dict[str, Any]]
    video_script: Optional[dict[str, Any]]
    errors: list[str]
    model_used: Optional[str]
    fallback_triggered: bool
