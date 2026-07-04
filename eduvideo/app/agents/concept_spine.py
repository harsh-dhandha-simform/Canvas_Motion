"""Concept Spine builder (MASTER_CONTEXT.md §2.1, §2 stage 6). Computes each
concept's real [start, end] time window from scene_timings.json — the shared
backbone that both video_plan.json and (later) interactions.json key off.

Purely deterministic: groups scenes by concept_id and takes the min/max bound of
each group. Concepts must not interleave in time (script_writer/storyboarder
enforce non-decreasing concept order upstream) — this stage fails loudly rather
than silently reordering or merging windows.
"""

from __future__ import annotations

from pathlib import Path

from app.clients.tracing import span
from app.jobs import read_artifact, write_artifact
from app.schemas.concepts import ConceptWindow, Concepts
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.scene_timings import SceneTimings

_TOLERANCE = 0.5


def run(job_dir: Path) -> None:
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    scene_timings = read_artifact(job_dir, "scene_timings", SceneTimings)

    with span("concept_spine", input=f"{len(analysis.concepts)} concepts") as obs:
        bounds: dict[str, tuple[float, float]] = {}
        for scene in scene_timings.scenes:
            start, end = scene.start, scene.start + scene.duration
            if scene.concept_id in bounds:
                prev_start, prev_end = bounds[scene.concept_id]
                bounds[scene.concept_id] = (min(prev_start, start), max(prev_end, end))
            else:
                bounds[scene.concept_id] = (start, end)

        missing = [c.id for c in analysis.concepts if c.id not in bounds]
        if missing:
            raise ValueError(f"concept_spine: no scenes found for concept(s): {missing}")

        windows = [
            ConceptWindow(
                id=c.id,
                title=c.title,
                order=c.order,
                description=c.description,
                start=round(bounds[c.id][0], 2),
                end=round(bounds[c.id][1], 2),
            )
            for c in analysis.concepts
        ]

        # Ordered, contiguous, non-overlapping, covering [0, total] — fail loudly on
        # interleaving/gaps rather than silently reordering or merging.
        cursor = 0.0
        for w in windows:
            if abs(w.start - cursor) > _TOLERANCE:
                raise ValueError(
                    f"concept_spine: concepts interleave or have a timing gap — concept '{w.id}' "
                    f"starts at {w.start}, expected ~{round(cursor, 2)} (windows must be contiguous "
                    "and in content_analysis order; check for a scene tagged with an out-of-order "
                    "concept_id upstream)"
                )
            if w.end <= w.start:
                raise ValueError(f"concept_spine: concept '{w.id}' has a non-positive window ({w.start} -> {w.end})")
            cursor = w.end

        total = round(cursor, 2)
        write_artifact(job_dir, "concepts", Concepts(concepts=windows, totalDurationSec=total))
        obs.update(output=f"{len(windows)} concept windows, totalDurationSec={total}")
