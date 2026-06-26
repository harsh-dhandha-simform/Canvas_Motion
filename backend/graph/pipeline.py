from langgraph.graph import StateGraph, END
from graph.state import PipelineState
from graph.nodes import (
    researcher_node,
    director_node,
    scriptwriter_node,
    visual_architect_node,
    merge_node,
    validator_node,
    assembler_node,
)


def build_state_graph():
    workflow = StateGraph(PipelineState)

    workflow.add_node("researcher", researcher_node)
    workflow.add_node("director", director_node)
    workflow.add_node("scriptwriter", scriptwriter_node)
    workflow.add_node("visual_architect", visual_architect_node)
    workflow.add_node("merge", merge_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("assembler", assembler_node)

    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "director")

    # Fan-out: content + visual run in parallel (disjoint panel data)
    workflow.add_edge("director", "scriptwriter")
    workflow.add_edge("director", "visual_architect")

    # Fan-in: merge waits for both before combining
    workflow.add_edge("scriptwriter", "merge")
    workflow.add_edge("visual_architect", "merge")

    workflow.add_edge("merge", "validator")
    workflow.add_edge("validator", "assembler")
    workflow.add_edge("assembler", END)

    return workflow.compile()


compiled_graph = build_state_graph()
