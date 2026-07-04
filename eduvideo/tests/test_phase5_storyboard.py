"""Phase 5 end-of-phase test: run Content Understanding + Script Writer +
Storyboarder against a sample technical topic and eyeball the result.

Run with: uv run python tests/test_phase5_storyboard.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs import create_job, job_dir_for, read_artifact
from app.orchestrator import run_pipeline
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.enums import AnimationPreset, DiagramType, Template
from app.schemas.input import JobInput
from app.schemas.storyboard import Storyboard

TOPIC = "TCP three-way handshake for undergrad CS students"


def main() -> None:
    job_id = create_job(
        JobInput(topic=TOPIC, audience="undergrad CS students", durationSec=90, includeQuiz=True)
    )
    job_dir = job_dir_for(job_id)

    manifest = run_pipeline(job_id, up_to="storyboard")
    print(f"job_id={job_id}")
    print(f"job_dir={job_dir}")
    print(f"manifest.status={manifest.status}, stages_done={manifest.stages_done}")

    assert (job_dir / "storyboard.json").exists(), "storyboard.json was not written"
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    storyboard = read_artifact(job_dir, "storyboard", Storyboard)

    # ids sequential
    expected_ids = [f"scene_{i:03d}" for i in range(1, len(storyboard.scenes) + 1)]
    assert [s.id for s in storyboard.scenes] == expected_ids, "scene ids not sequential"

    # templates + animations valid (Pydantic enums already enforce this, but assert explicitly)
    for s in storyboard.scenes:
        assert s.template in Template
        assert s.animation in AnimationPreset

    # concept coverage + strict order (no exceptions, including quiz — Phase 8's
    # concept spine requires concepts to never interleave in time)
    valid_ids = {c.id for c in analysis.concepts}
    used_ids = {s.concept_id for s in storyboard.scenes}
    assert used_ids <= valid_ids, f"unknown concept_id(s): {used_ids - valid_ids}"
    assert used_ids == valid_ids, f"not all concepts covered: missing {valid_ids - used_ids}"

    order_by_id = {c.id: c.order for c in analysis.concepts}
    orders = [order_by_id[s.concept_id] for s in storyboard.scenes]
    assert orders == sorted(orders), f"scenes out of concept order: {orders}"

    # at least one DiagramScene with consistent nodes/edges (schema validator already
    # enforces edge/node consistency; this just confirms one was actually produced)
    diagram_scenes = [s for s in storyboard.scenes if s.template == Template.DIAGRAM]
    assert diagram_scenes, "expected at least one DiagramScene for a protocol handshake topic"
    sequence_diagrams = [s for s in diagram_scenes if s.props["diagramType"] == DiagramType.SEQUENCE.value]
    assert sequence_diagrams, f"expected a sequence diagram for a handshake; got diagramTypes={[s.props['diagramType'] for s in diagram_scenes]}"

    code_scenes = [s for s in storyboard.scenes if s.template == Template.CODE]

    print("\n--- storyboard.json scene summary ---")
    for s in storyboard.scenes:
        print(f"{s.id}: template={s.template.value:<16} concept_id={s.concept_id} animation={s.animation.value} estDuration={s.estDuration}")
        if s.template == Template.DIAGRAM:
            print(f"    diagramType={s.props['diagramType']} nodes={[n['id'] for n in s.props['nodes']]} edges={[(e['from'], e['to']) for e in s.props['edges']]}")
        if s.template == Template.CODE:
            print(f"    language={s.props['language']}\n    code:\n{s.props['code']}")

    print(
        f"\nscenes={len(storyboard.scenes)}, concepts covered={len(used_ids)}/{len(valid_ids)}, "
        f"diagram scenes={len(diagram_scenes)} (sequence={len(sequence_diagrams)}), code scenes={len(code_scenes)}"
    )
    print("ids sequential: OK, templates/animations valid: OK, concept coverage/order: OK")


if __name__ == "__main__":
    main()
