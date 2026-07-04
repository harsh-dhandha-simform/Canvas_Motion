"""Phase 3 end-of-phase test: run the real Content Understanding agent against a
sample technical topic and eyeball the result.

Run with: uv run python tests/test_phase3_content_analysis.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.input import JobInput

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(JobInput(topic=TOPIC, audience="undergrad CS students"))
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="content_analysis")
    print(f"job_id={job_id}")
    print(f"job_dir={job_dir}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")

    assert (job_dir / "content_analysis.json").exists(), "content_analysis.json was not written"
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)

    ids = [c.id for c in analysis.concepts]
    orders = [c.order for c in analysis.concepts]
    expected_ids = [f"c{i}" for i in range(1, len(ids) + 1)]
    assert ids == expected_ids, f"concept ids not stable/ordered c1..cN: {ids}"
    assert orders == list(range(1, len(orders) + 1)), f"concept order not 1..N: {orders}"
    assert 3 <= len(analysis.concepts) <= 8, f"expected 3-8 concepts, got {len(analysis.concepts)}"

    print("\n--- content_analysis.json (for eyeballing) ---")
    print(analysis.model_dump_json(indent=2))
    print("\nconcept ids/order: OK (stable, ordered, count within 3-8)")


if __name__ == "__main__":
    main()
