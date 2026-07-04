"""Scene-timing reconciliation (MASTER_CONTEXT.md §2 stage 5). Assigns each
storyboard scene a real `start`/`duration` derived from actual voiceover audio,
writing `scene_timings.json`. Deterministic — no LLM.

Why concept-level, not scene-level, matching: a storyboard scene only carries a
`concept_id`, not a link to the specific script section it visualizes, and audio
duration is only tracked per section (`timings.Segment.section_index`). Concepts are
the one level at which both sides are known precisely, and every scene belongs to
exactly one concept, so each concept's real narrated-audio time is distributed across
that concept's scenes proportionally to their estimated durations — exact and
deterministic, no fragile text matching required.
"""

from __future__ import annotations

from pathlib import Path

from app.config import get_settings
from app.jobs import read_artifact, write_artifact
from app.schemas.scene_timings import SceneTime, SceneTimings
from app.schemas.script import Script
from app.schemas.storyboard import Storyboard
from app.schemas.timings import Timings


def _concept_audio_durations(script: Script, timings: Timings) -> dict[str, float]:
    concept_id_by_section = [section.concept_id for section in script.sections]
    durations: dict[str, float] = {}
    for seg in timings.segments:
        concept_id = concept_id_by_section[seg.section_index]
        durations[concept_id] = durations.get(concept_id, 0.0) + (seg.end - seg.start)
    return durations


def run(job_dir: Path) -> None:
    script = read_artifact(job_dir, "script", Script)
    storyboard = read_artifact(job_dir, "storyboard", Storyboard)
    timings = read_artifact(job_dir, "timings", Timings)
    default_duration = get_settings().config.video.default_scene_duration_sec

    concept_audio = _concept_audio_durations(script, timings)

    scenes_by_concept: dict[str, list[int]] = {}
    for i, scene in enumerate(storyboard.scenes):
        scenes_by_concept.setdefault(scene.concept_id, []).append(i)

    scene_duration = [0.0] * len(storyboard.scenes)
    for concept_id, indices in scenes_by_concept.items():
        budget = concept_audio.get(concept_id, 0.0)
        est_total = sum(storyboard.scenes[i].estDuration for i in indices)

        if budget > 0 and est_total > 0:
            allocated = 0.0
            for pos, i in enumerate(indices):
                if pos == len(indices) - 1:
                    duration = budget - allocated  # last scene absorbs the rounding remainder
                else:
                    duration = round(budget * (storyboard.scenes[i].estDuration / est_total), 2)
                    allocated += duration
                scene_duration[i] = max(duration, 0.0)
        else:
            # Degenerate case (no audio ever attributed to this concept): fall back
            # to a fixed duration rather than dividing by zero.
            for i in indices:
                scene_duration[i] = default_duration

    scene_times: list[SceneTime] = []
    cursor = 0.0
    for i, scene in enumerate(storyboard.scenes):
        duration = round(scene_duration[i], 2)
        scene_times.append(SceneTime(id=scene.id, concept_id=scene.concept_id, start=round(cursor, 2), duration=duration))
        cursor += duration

    write_artifact(job_dir, "scene_timings", SceneTimings(scenes=scene_times, totalDurationSec=round(cursor, 2)))
