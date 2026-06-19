"""
backend/graph/pipeline.py — LangGraph Pipeline Builder

Assembles the StateGraph by wiring all node transitions sequentially.
"""

from langgraph.graph import StateGraph, START, END

from graph.state import PipelineState
from graph.nodes import (
    director_node,
    scriptwriter_node,
    storyboard_node,
    sync_node,
    code_generator_node,
    post_process_node,
)


def create_pipeline() -> StateGraph:
    """
    Construct the video generation pipeline graph.
    Wires: START -> director -> scriptwriter -> storyboard -> sync -> code_generator -> post_process -> END
    """
    builder = StateGraph(PipelineState)

    # Register Nodes
    builder.add_node("director", director_node)
    builder.add_node("scriptwriter", scriptwriter_node)
    builder.add_node("storyboard", storyboard_node)
    builder.add_node("sync", sync_node)
    builder.add_node("code_generator", code_generator_node)
    builder.add_node("post_process", post_process_node)

    # Register Edges
    builder.add_edge(START, "director")
    builder.add_edge("director", "scriptwriter")
    builder.add_edge("scriptwriter", "storyboard")
    builder.add_edge("storyboard", "sync")
    builder.add_edge("sync", "code_generator")
    builder.add_edge("code_generator", "post_process")
    builder.add_edge("post_process", END)

    return builder
