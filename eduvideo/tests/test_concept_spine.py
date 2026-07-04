"""Plain-script test (run: uv run python tests/test_concept_spine.py).
Verifies the concept spine partitions scenes into contiguous per-primary windows
and rejects a non-adjacent concept reappearance (A…B…A)."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents import concept_spine
from app.jobs import read_artifact, write_json_artifact
from app.schemas.concepts import Concepts

_SYLLABUS = {
    "subtopics": [
        {"id": "st1", "title": "First", "teaching_goal": "Goal one"},
        {"id": "st2", "title": "Second", "teaching_goal": "Goal two"},
        {"id": "st3", "title": "Third", "teaching_goal": "Goal three"},
    ],
    "key_terms": [],
}


def _scenes(covers_seq: list[list[str]]) -> dict:
    scenes, cursor = [], 0.0
    for i, covers in enumerate(covers_seq):
        scenes.append({"id": f"scene-{i+1}", "covers": covers, "start": cursor, "duration": 10.0})
        cursor += 10.0
    return {"scenes": scenes}


def _run(covers_seq: list[list[str]]) -> Concepts:
    d = Path(tempfile.mkdtemp())
    write_json_artifact(d, "syllabus", _SYLLABUS)
    write_json_artifact(d, "scenes_timed", _scenes(covers_seq))
    concept_spine.run(d)
    return read_artifact(d, "concepts", Concepts)


def main() -> None:
    # Title (empty) + st1,st1, st2, st3,st3 → 3 contiguous windows tiling [0, 60].
    c = _run([[], ["st1"], ["st1"], ["st2"], ["st3"], ["st3"]])
    assert len(c.concepts) == 3, [w.id for w in c.concepts]
    assert [w.id for w in c.concepts] == ["st1", "st2", "st3"]
    assert [w.title for w in c.concepts] == ["First", "Second", "Third"]
    assert c.concepts[0].start == 0.0 and c.concepts[0].end == 30.0  # scene-1 inherits st1
    assert c.concepts[1].start == 30.0 and c.concepts[1].end == 40.0
    assert c.concepts[2].start == 40.0 and c.concepts[2].end == 60.0
    assert c.totalDurationSec == 60.0
    print("contiguous partition OK:", [(w.id, w.start, w.end) for w in c.concepts])

    # Non-adjacent reappearance A…B…A must fail loudly.
    try:
        _run([["st1"], ["st2"], ["st1"]])
        raise AssertionError("expected ValueError on non-adjacent reappearance")
    except ValueError as e:
        assert "reappears non-adjacently" in str(e), e
        print("A…B…A rejected OK")

    print("test_concept_spine: PASS")


if __name__ == "__main__":
    main()
