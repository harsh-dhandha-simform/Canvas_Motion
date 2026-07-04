"""Plain-script test (run: uv run python tests/test_interaction_planner.py). Requires LLM.
Verifies interaction_planner consumes syllabus + scenes_timed + video_script and emits
exactly one valid interaction per concept."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents import interaction_planner
from app.jobs import read_artifact, write_artifact, write_json_artifact
from app.schemas.concepts import ConceptWindow, Concepts
from app.schemas.interactions import Interactions

_VALID_TYPES = {
    "step_through", "code_playground", "param_explorer", "diagram_explore",
    "quiz", "data_structure", "flashcards", "custom",
}


def main() -> None:
    d = Path(tempfile.mkdtemp())
    concepts = Concepts(
        concepts=[
            ConceptWindow(id="tcp-handshake", title="The TCP 3-way handshake", order=0,
                          description="How a client and server establish a connection with SYN/SYN-ACK/ACK.",
                          start=0.0, end=30.0),
            ConceptWindow(id="big-o", title="Big-O of binary search", order=1,
                          description="Why binary search is O(log n) as input size grows.",
                          start=30.0, end=60.0),
        ],
        totalDurationSec=60.0,
    )
    write_artifact(d, "concepts", concepts)
    write_json_artifact(d, "syllabus", {
        "topic": "Networking + algorithms sampler",
        "subtopics": [
            {"id": "tcp-handshake", "title": "The TCP 3-way handshake",
             "teaching_goal": "Walk the SYN/SYN-ACK/ACK exchange.", "must_cover": ["SYN", "ACK"]},
            {"id": "big-o", "title": "Big-O of binary search",
             "teaching_goal": "Show O(log n) growth.", "must_cover": ["logarithmic"]},
        ],
        "key_terms": ["SYN", "ACK", "logarithmic"],
        "misconceptions": [],
    })
    write_json_artifact(d, "scenes_timed", {"scenes": [
        {"id": "scene-1", "covers": ["tcp-handshake"], "start": 0.0, "duration": 30.0},
        {"id": "scene-2", "covers": ["big-o"], "start": 30.0, "duration": 30.0},
    ]})
    write_json_artifact(d, "video_script", {"scenes": [
        {"id": "scene-1", "panels": [{"type": "SequenceDiagram",
                                      "data": {"steps": ["SYN", "SYN-ACK", "ACK"]}}]},
        {"id": "scene-2", "panels": [{"type": "LineChart", "data": {"label": "log n"}}]},
    ]})

    interaction_planner.run(d)
    interactions = read_artifact(d, "interactions", Interactions)

    ids = [i.concept_id for i in interactions.interactions]
    assert sorted(ids) == ["big-o", "tcp-handshake"], ids
    for i in interactions.interactions:
        assert i.type in _VALID_TYPES, i.type
    print("interactions:", [(i.concept_id, i.type) for i in interactions.interactions])
    print("test_interaction_planner: PASS")


if __name__ == "__main__":
    main()
