"""The eduvideo LangGraph generation engine. Ported from test-remotion
backend/graph/pipeline.py; the reference `tts` node is replaced by `voiceover`
(SEAM 1) on an unconditional edge — voiceover_node self-gates on enable_audio and
no-ops (keeping merge's estimate timing) when audio is off."""

from langgraph.graph import END, StateGraph

from app.engine.agents.director.node import director_node
from app.engine.agents.researcher.node import researcher_node
from app.engine.agents.scriptwriter.node import scriptwriter_node
from app.engine.agents.visual_architect.node import visual_architect_node
from app.engine.nodes import assembler_node, merge_node, validator_node, voiceover_node
from app.engine.state import PipelineState


def build_state_graph():
    workflow = StateGraph(PipelineState)

    workflow.add_node("researcher", researcher_node)
    workflow.add_node("director", director_node)
    workflow.add_node("scriptwriter", scriptwriter_node)
    workflow.add_node("visual_architect", visual_architect_node)
    workflow.add_node("merge", merge_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("voiceover", voiceover_node)
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
    workflow.add_edge("validator", "voiceover")
    workflow.add_edge("voiceover", "assembler")
    workflow.add_edge("assembler", END)

    return workflow.compile()


compiled_graph = build_state_graph()
