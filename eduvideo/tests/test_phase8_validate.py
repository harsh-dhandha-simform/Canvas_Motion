"""Phase 8 end-of-phase test: run the full pipeline through Validate, confirm
concepts.json + video_plan.json are correct, then inject deliberately broken plans
and confirm the validator catches them and writes validation_errors.json.

Run with: uv run python tests/test_phase8_validate.py
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.concepts import Concepts
from app.schemas.enums import JobStatus
from app.schemas.input import JobInput
from app.validation import validator

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(
        JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90, includeQuiz=True)
    )
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="validate")
    print(f"job_id={job_id}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")
    assert manifest.status != JobStatus.FAILED, f"pipeline failed: {manifest.error}"
    assert not (job_dir / "validation_errors.json").exists(), "validator reported errors on the clean plan"

    # --- concepts.json: contiguous, covers [0, total], one window per concept ---
    concepts = read_artifact(job_dir, "concepts", Concepts)
    cursor = 0.0
    for w in concepts.concepts:
        assert abs(w.start - cursor) < 0.01, f"concept '{w.id}' window not contiguous: {w}"
        cursor = w.end
    assert abs(cursor - concepts.totalDurationSec) < 0.01

    plan = json.loads((job_dir / "video_plan.json").read_text(encoding="utf-8"))
    assert abs(concepts.totalDurationSec - plan["video"]["durationSec"]) < 0.5, (
        "concepts.totalDurationSec != video.durationSec"
    )
    print(f"\nconcepts.json: {len(concepts.concepts)} windows, contiguous [0, {concepts.totalDurationSec}]: OK")
    for w in concepts.concepts:
        print(f"  {w.id}: [{w.start:>6.2f} - {w.end:>6.2f}] {w.title}")

    print(f"\nvideo_plan.json: {len(plan['scenes'])} scenes, durationSec={plan['video']['durationSec']}, validator: OK (no repair needed)")

    # --- inject a deliberately broken plan: durations don't sum ---
    broken_duration = copy.deepcopy(plan)
    broken_duration["scenes"][0]["duration"] += 50.0
    (job_dir / "video_plan.json").write_text(json.dumps(broken_duration), encoding="utf-8")
    try:
        validator.run(job_dir)
        raise AssertionError("expected validator to raise on a duration-sum mismatch")
    except ValueError as exc:
        errors_doc = json.loads((job_dir / "validation_errors.json").read_text(encoding="utf-8"))
        assert any("durationSec" in e["message"] or "duration" in e["message"] for e in errors_doc["errors"])
        print(f"\ninjected duration-mismatch plan: caught as expected ({exc})")
    (job_dir / "validation_errors.json").unlink()

    # --- inject a deliberately broken plan: unknown concept_id ---
    broken_concept = copy.deepcopy(plan)
    broken_concept["scenes"][0]["concept_id"] = "c999"
    (job_dir / "video_plan.json").write_text(json.dumps(broken_concept), encoding="utf-8")
    try:
        validator.run(job_dir)
        raise AssertionError("expected validator to raise on an unknown concept_id")
    except ValueError as exc:
        errors_doc = json.loads((job_dir / "validation_errors.json").read_text(encoding="utf-8"))
        assert any("concept_id" in e["message"] for e in errors_doc["errors"])
        print(f"injected unknown-concept_id plan: caught as expected ({exc})")

    # restore the good plan
    (job_dir / "video_plan.json").write_text(json.dumps(plan), encoding="utf-8")
    (job_dir / "validation_errors.json").unlink()
    validator.run(job_dir)  # should pass cleanly again
    print("\nrestored good plan: validator passes again: OK")

    print("\nPhase 8 test: ALL PASSED")


if __name__ == "__main__":
    main()
