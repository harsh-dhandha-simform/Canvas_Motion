"""Plain-script test (run: uv run python tests/test_json_artifacts.py).
Verifies the raw-dict JSON artifact helpers + immutability that back the
LangGraph engine's per-node persistence."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import read_json_artifact, write_json_artifact


def main() -> None:
    with tempfile.TemporaryDirectory() as d:
        job_dir = Path(d)
        write_json_artifact(job_dir, "x", {"a": 1})
        assert read_json_artifact(job_dir, "x") == {"a": 1}, "roundtrip failed"
        assert read_json_artifact(job_dir, "missing") is None, "missing should be None"
        try:
            write_json_artifact(job_dir, "x", {"a": 2})
            raise AssertionError("expected FileExistsError on overwrite")
        except FileExistsError:
            pass
        # overwrite=True is allowed
        write_json_artifact(job_dir, "x", {"a": 3}, overwrite=True)
        assert read_json_artifact(job_dir, "x") == {"a": 3}, "overwrite=True failed"
    print("test_json_artifacts: PASS")


if __name__ == "__main__":
    main()
