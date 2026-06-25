from langgraph.graph import StateGraph, END
from graph.state import PipelineState
from graph.nodes import (
    director_node,
    scriptwriter_node,
    storyboard_node,
    sync_node,
    assembler_node,
)


def build_state_graph():
    workflow = StateGraph(PipelineState)

    # Add nodes
    workflow.add_node("director", director_node)
    workflow.add_node("scriptwriter", scriptwriter_node)
    workflow.add_node("storyboard", storyboard_node)
    workflow.add_node("sync", sync_node)
    workflow.add_node("assembler", assembler_node)

    # Define edges (linear flow)
    workflow.set_entry_point("director")
    workflow.add_edge("director", "scriptwriter")
    workflow.add_edge("scriptwriter", "storyboard")
    workflow.add_edge("storyboard", "sync")
    workflow.add_edge("sync", "assembler")
    workflow.add_edge("assembler", END)

    return workflow.compile()


compiled_graph = build_state_graph()
