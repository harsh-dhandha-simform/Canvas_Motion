"""
backend/utils/timing.py — deterministic scene timing (replaces the Sync LLM agent).

Scene duration is the MAX of:
  - the absorb time its components need (sum of per-component minSeconds, from the
    catalog metadata), and
  - the time needed to read its narration on screen (reading-speed based),
then all scenes are scaled so they sum EXACTLY to total_seconds × fps.

No LLM: timing is arithmetic, so it lives in Python where it is fast and never wrong.
"""

import logging

from app.engine.catalog import min_seconds

logger = logging.getLogger(__name__)

_MIN_SCENE_FRAMES_30FPS = 120           # 4s floor at 30fps
_WORDS_PER_SECOND = 2.5                 # comfortable narration reading/speaking pace
_TRANSITION_FRAMES_30FPS = 15           # overlay is inside the scene; informational


def _reading_seconds(narration: str | None) -> float:
    if not narration:
        return 0.0
    words = len(narration.split())
    return words / _WORDS_PER_SECOND


def _scene_base_seconds(scene: dict) -> float:
    """Absorb time = sum of the scene's component minSeconds (parallel panels still
    need the longest, but content is read together — sum is the safe upper estimate
    for a single full layout, capped for multi-panel)."""
    panels = scene.get("panels", [])
    if not panels:
        return 4.0 # default to 4 seconds if no panels
    secs = [min_seconds(p.get("type", "")) for p in panels]
    # one full-screen panel → its own time; multi-panel → the longest + a small premium
    if len(secs) == 1:
        return secs[0]
    return max(secs) + 0.4 * sum(sorted(secs)[:-1])


def compute_timings(scenes: list[dict], total_seconds: int, fps: int = 30, max_seconds: int | None = None) -> list[dict]:
    """Assign duration_frames + start_frame to each scene. Mutates and returns scenes.

    `scenes` items need: panels[{type}] and optionally narration. Order is preserved.

    The natural length (max of component-absorb time and narration reading time per scene)
    is the baseline. It is scaled UP to `total_seconds` if the content is shorter, and — when
    `max_seconds` is given — scaled DOWN to that hard cap if the content would run longer. The
    cap is a last-resort clamp; content is budgeted upstream (researcher subtopic count) so it
    rarely fires, but it guarantees no video ever exceeds `max_seconds`.
    """
    total_frames = total_seconds * fps
    if not scenes:
        return scenes

    min_scene_frames = 4 * fps

    # Step 1: base = max(component absorb, narration reading), floored.
    bases = []
    for sc in scenes:
        absorb = _scene_base_seconds(sc)
        reading = _reading_seconds(sc.get("narration"))
        base_frames = max(absorb, reading) * fps
        bases.append(max(min_scene_frames, base_frames))

    # Step 2: target = natural length, but at least total_frames (floor) and at most the cap.
    raw_total = sum(bases)
    target_frames = max(raw_total, total_frames)
    capped = False
    if max_seconds is not None and target_frames > max_seconds * fps:
        target_frames = max_seconds * fps
        capped = True
    scale = target_frames / raw_total if raw_total else 1.0

    # When capping down, relax the per-scene floor so the sum can actually reach the cap.
    floor = min_scene_frames if scale >= 1.0 else max(fps, round(min_scene_frames * scale))
    durations = [max(floor, round(b * scale)) for b in bases]

    # Step 3: absorb rounding drift so the total lands exactly on target when we scaled.
    if scale != 1.0:
        drift = target_frames - sum(durations)
        if drift != 0:
            if len(durations) > 2:
                idx = max(range(1, len(durations) - 1), key=lambda i: durations[i])
            else:
                idx = len(durations) - 1
            durations[idx] = max(floor, durations[idx] + drift)
    if capped:
        logger.info("[timing] capped video to max %ds", max_seconds)

    # Step 4: write back duration_frames + start_frame.
    cursor = 0
    for sc, dur in zip(scenes, durations):
        sc["duration_frames"] = dur
        sc["start_frame"] = cursor
        cursor += dur

    logger.info(
        "[timing] %d scenes → %d frames (target %d)",
        len(scenes), sum(durations), total_frames,
    )
    return scenes
