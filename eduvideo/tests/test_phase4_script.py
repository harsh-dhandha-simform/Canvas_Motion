"""Phase 4 end-of-phase test: run Content Understanding + Script Writer against a
sample technical topic (with a quiz requested) and eyeball the result.

Run with: uv run python tests/test_phase4_script.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.enums import SceneType
from app.schemas.input import JobInput
from app.schemas.script import Script

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(
        JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90, includeQuiz=True)
    )
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="script")
    print(f"job_id={job_id}")
    print(f"job_dir={job_dir}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")

    assert (job_dir / "script.json").exists(), "script.json was not written"
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    script = read_artifact(job_dir, "script", Script)

    valid_ids = {c.id for c in analysis.concepts}
    used_ids = {s.concept_id for s in script.sections}
    assert used_ids <= valid_ids, f"unknown concept_id(s) used: {used_ids - valid_ids}"
    assert used_ids == valid_ids, f"not all concepts covered: missing {valid_ids - used_ids}"

    # Strict, no exceptions: concept_id must be non-decreasing across ALL sections,
    # including quiz (Phase 8's concept spine requires concepts to never interleave
    # in time; a quiz reviewing earlier material keeps its POSITION's concept_id).
    order_by_id = {c.id: c.order for c in analysis.concepts}
    orders = [order_by_id[s.concept_id] for s in script.sections]
    assert orders == sorted(orders), f"sections do not follow strict concept order: {orders}"

    assert script.sections[0].type == SceneType.HOOK, "first section should be type=hook"
    assert script.sections[-1].type == SceneType.OUTRO, "last section should be type=outro"

    quiz_sections = [s for s in script.sections if s.type == SceneType.QUIZ]
    assert quiz_sections, "includeQuiz=True but no quiz section was produced"
    for q in quiz_sections:
        assert q.answer in (q.options or []), f"quiz answer not in options: {q.answer!r} / {q.options}"

    print("\n--- script.json (for eyeballing) ---")
    print(script.model_dump_json(indent=2))
    print(
        f"\nsections={len(script.sections)}, concepts covered={len(used_ids)}/{len(valid_ids)}, "
        f"concept order: OK, hook-first/outro-last: OK, quiz answer-in-options: OK"
    )


if __name__ == "__main__":
    main()
