"""Concept Spine builder (MASTER_CONTEXT.md §2.1). Derives the concept spine —
the shared time-window backbone the interactions stage and the React player key
off — from the engine's syllabus.json (subtopics) + scenes_timed.json (the
gapless, ordered scene windows the assembler wrote).

Purely deterministic. Each scene declares which subtopics it `covers`; the scene's
PRIMARY concept is covers[0] (a scene with no covers — e.g. a title/outro — inherits
the previous scene's primary; scene 0 borrows the first non-empty primary). Runs of
consecutive scenes sharing a primary collapse into one contiguous window
[first.start, last.end]. Because scenes are gapless and ordered, the windows tile
[0, total] by construction; we still assert contiguity and fail loudly if a primary
reappears non-adjacently (A…B…A) rather than silently producing overlapping windows.
"""

from __future__ import annotations

from pathlib import Path

from loguru import logger

from app.clients.tracing import span
from app.jobs import read_json_artifact, write_artifact
from app.schemas.concepts import ConceptWindow, Concepts

_TOLERANCE = 0.5


def _primaries(scenes: list[dict]) -> list[str | None]:
    """Per-scene primary concept id: covers[0], else inherit previous; scene 0 with no
    covers borrows the first non-empty primary in the sequence."""
    raw = [(s.get("covers") or [None])[0] for s in scenes]
    first_non_empty = next((p for p in raw if p), None)
    out: list[str | None] = []
    for i, p in enumerate(raw):
        if p:
            out.append(p)
        elif i == 0:
            out.append(first_non_empty)
        else:
            out.append(out[-1])
    return out


def run(job_dir: Path) -> None:
    syllabus = read_json_artifact(job_dir, "syllabus")
    scenes_timed = read_json_artifact(job_dir, "scenes_timed")
    if syllabus is None or scenes_timed is None:
        raise FileNotFoundError("concept_spine: syllabus.json and scenes_timed.json must exist (run the engine first)")

    scenes = scenes_timed.get("scenes", [])
    if not scenes:
        raise ValueError("concept_spine: scenes_timed.json has no scenes")
    subtopics = {st["id"]: st for st in syllabus.get("subtopics", [])}

    with span("concept_spine", input=f"{len(scenes)} scenes, {len(subtopics)} subtopics") as obs:
        primaries = _primaries(scenes)
        if not any(primaries):
            raise ValueError("concept_spine: no scene declares a concept in `covers` — cannot build a spine")

        windows: list[ConceptWindow] = []
        seen: set[str] = set()
        i = 0
        n = len(scenes)
        while i < n:
            pid = primaries[i]
            # Extend the run of consecutive scenes sharing this primary.
            j = i
            while j + 1 < n and primaries[j + 1] == pid:
                j += 1
            if pid in seen:
                raise ValueError(
                    f"concept_spine: concept '{pid}' reappears non-adjacently (A…B…A) — scenes "
                    "covering one concept must be contiguous; check scene `covers` ordering upstream"
                )
            seen.add(pid)

            st = subtopics.get(pid, {})
            if not st:
                logger.warning("concept_spine: primary '{}' not in syllabus subtopics — using id as title", pid)
            start = round(scenes[i]["start"], 2)
            end = round(scenes[j]["start"] + scenes[j]["duration"], 2)
            windows.append(
                ConceptWindow(
                    id=pid,
                    title=st.get("title") or pid,
                    order=len(windows),
                    description=st.get("teaching_goal") or st.get("depth_notes") or st.get("title") or pid,
                    start=start,
                    end=end,
                )
            )
            i = j + 1

        # Contiguity safety check — windows should tile [0, total] with no gaps/overlap.
        cursor = 0.0
        for w in windows:
            if abs(w.start - cursor) > _TOLERANCE:
                raise ValueError(
                    f"concept_spine: window for '{w.id}' starts at {w.start}, expected ~{round(cursor, 2)} "
                    "(windows must be contiguous — check scenes_timed gaplessness)"
                )
            if w.end <= w.start:
                raise ValueError(f"concept_spine: concept '{w.id}' has a non-positive window ({w.start} -> {w.end})")
            cursor = w.end

        total = round(cursor, 2)
        write_artifact(job_dir, "concepts", Concepts(concepts=windows, totalDurationSec=total))
        obs.update(output=f"{len(windows)} concept windows, totalDurationSec={total}")
        logger.info("concept_spine: {} windows tiling [0, {}]", len(windows), total)
