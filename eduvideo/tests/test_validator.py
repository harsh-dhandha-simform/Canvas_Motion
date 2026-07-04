"""Plain-script test (run: uv run python tests/test_validator.py). No LLM/network.
Verifies the slimmed tail validator passes a clean concepts+interactions pair and
rejects a `custom` sandbox violation (injected fetch()) without auto-repair."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.validation import validator

_CONCEPTS = {
    "concepts": [
        {"id": "c1", "title": "One", "order": 0, "description": "d1", "start": 0.0, "end": 10.0},
        {"id": "c2", "title": "Two", "order": 1, "description": "d2", "start": 10.0, "end": 20.0},
    ],
    "totalDurationSec": 20.0,
}


def _write(d: Path, interactions: dict) -> None:
    (d / "concepts.json").write_text(json.dumps(_CONCEPTS), encoding="utf-8")
    (d / "interactions.json").write_text(json.dumps(interactions), encoding="utf-8")


def main() -> None:
    # Clean: one valid interaction per concept → passes.
    d = Path(tempfile.mkdtemp())
    _write(d, {"interactions": [
        {"concept_id": "c1", "type": "quiz", "title": "Q",
         "props": {"question": "?", "options": ["a", "b"], "answer": "a"}},
        {"concept_id": "c2", "type": "flashcards", "title": "F",
         "props": {"cards": [{"front": "x", "back": "y"}]}},
    ]})
    validator.run(d)  # must not raise
    assert not (d / "validation_errors.json").exists()
    print("clean pair: PASS")

    # Sandbox violation: custom code with fetch() → structural error, no repair, raises.
    d2 = Path(tempfile.mkdtemp())
    _write(d2, {"interactions": [
        {"concept_id": "c1", "type": "custom", "title": "Bad", "props": {},
         "custom": {"entry": "C.jsx", "code": "function C(){ fetch('http://evil'); return null }"}},
        {"concept_id": "c2", "type": "flashcards", "title": "F",
         "props": {"cards": [{"front": "x", "back": "y"}]}},
    ]})
    try:
        validator.run(d2)
        raise AssertionError("expected ValueError on sandbox violation")
    except ValueError as e:
        assert "validation failed" in str(e), e
        report = json.loads((d2 / "validation_errors.json").read_text())
        assert any("disallowed pattern" in x["message"] for x in report["errors"]), report
        print("fetch() sandbox rejection: PASS")

    print("test_validator: PASS")


if __name__ == "__main__":
    main()
