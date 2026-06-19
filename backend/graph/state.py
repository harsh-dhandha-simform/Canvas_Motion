"""
backend/graph/state.py — Pipeline State Definition

Defines the TypedDict representing the state of the video generation pipeline.
"""

from typing import TypedDict, Optional, Dict, Any


class PipelineState(TypedDict):
    topic: str
    skip_audio: bool
    director_brief: Optional[Dict[str, Any]]
    script: Optional[Dict[str, Any]]
    audio_design: Optional[Dict[str, Any]]
    storyboard: Optional[Dict[str, Any]]
    timing: Optional[Dict[str, Any]]
    tsx_code: Optional[str]
