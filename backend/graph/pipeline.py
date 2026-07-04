from langgraph.graph import StateGraph, END
from graph.state import PipelineState
from graph.nodes import (
    merge_node,
    validator_node,
    tts_node,
    assembler_node,
)
from agents.researcher.node import researcher_node
from agents.director.node import director_node
from agents.scriptwriter.node import scriptwriter_node
from agents.visual_architect.node import visual_architect_node


def build_state_graph():
    workflow = StateGraph(PipelineState)

    workflow.add_node("researcher", researcher_node)
    workflow.add_node("director", director_node)
    workflow.add_node("scriptwriter", scriptwriter_node)
    workflow.add_node("visual_architect", visual_architect_node)
    workflow.add_node("merge", merge_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("tts", tts_node)
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
    
    # Conditional edge: run TTS if enabled, else go straight to assembler
    def route_tts(state: PipelineState) -> str:
        if state.get("enable_audio", False) and state.get("checkpoint_slug"):
            return "tts"
        return "assembler"
        
    workflow.add_conditional_edges("validator", route_tts)
    workflow.add_edge("tts", "assembler")
    workflow.add_edge("assembler", END)

    return workflow.compile()


compiled_graph = build_state_graph()
