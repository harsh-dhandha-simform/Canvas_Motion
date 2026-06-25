"""
backend/agents/sync.py — Agent 4: Sync Specialist

Component-aware: uses component_type from the script to assign frame budgets.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "SyncSpecialist"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a video timing specialist. Compute Remotion frame timings for a technical video.

{_CTX["remotion_timing_rules"]}

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "fps": 30,
  "total_frames": <int>,
  "scenes": [
    {{
      "scene_index": <int>,
      "component_type": "<ExactComponentName>",
      "start_frame": <int>,
      "duration_frames": <int>
    }}
  ]
}}

## TIMING ALGORITHM
1. total_frames = total_seconds x 30
2. Assign each scene a base budget from the per-component table above (use midpoint of range)
3. Scale all budgets proportionally so they sum to total_frames exactly
4. Minimum duration_frames for any scene: 90

## ADJUSTMENT RULES
- AnimatedTitle (intro, index=0): use minimum (120 frames)
- AnimatedTitle (outro, last scene): use minimum (120 frames)
- ArchitectureDiagram: use upper half of range (300-360 frames)
- SplitScreen with code: add 30 extra frames
- start_frame[0] = 0
- start_frame[i] = sum of all previous duration_frames
- sum(all duration_frames) MUST equal total_frames exactly
  -> adjust the last scene's duration_frames to absorb any rounding difference

Return ONLY valid JSON. No markdown.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    total_seconds = director_brief.get("total_seconds", 60)
    logger.info("[%s] Computing timings: %ds @ 30fps", AGENT_NAME, total_seconds)

    scene_lines = "\n".join(
        f"  Scene {s.get('scene_index', i)}: component_type={s.get('component_type')!r}"
        for i, s in enumerate(script.get("scenes", []))
    )

    user_message = (
        f"total_seconds: {total_seconds}\n"
        f"total_frames: {total_seconds * 30}\n\n"
        f"Scenes:\n{scene_lines}\n\n"
        "Compute duration_frames for each scene using the per-component frame budget table. "
        "Ensure sum(duration_frames) == total_frames exactly. Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
        max_tokens=3000,
        agent_name=AGENT_NAME,
    )

    timing: dict = json.loads(extract_json(raw))

    # Hard fix: ensure frame sum matches
    expected = total_seconds * 30
    timing["total_frames"] = expected
    timing["fps"] = 30
    scenes = timing.get("scenes", [])
    if scenes:
        actual = sum(s.get("duration_frames", 0) for s in scenes)
        if actual != expected:
            diff = expected - actual
            scenes[-1]["duration_frames"] = max(90, scenes[-1]["duration_frames"] + diff)
        # Recompute start_frames
        cursor = 0
        for s in scenes:
            s["start_frame"] = cursor
            cursor += s.get("duration_frames", 0)
        # Backfill component_type from script
        script_scenes = script.get("scenes", [])
        for i, s in enumerate(scenes):
            if i < len(script_scenes):
                s["component_type"] = script_scenes[i].get("component_type", s.get("component_type", "BulletList"))

    logger.info("[%s] ✅ Timing: %d frames, %d scenes", AGENT_NAME, expected, len(scenes))
    return timing
