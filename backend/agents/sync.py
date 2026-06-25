"""
backend/agents/sync.py — Agent 4: Sync Specialist

Component-aware timing with multi-panel layout consideration.
Multi-panel scenes need more time since there's more content to absorb.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "SyncSpecialist"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a video timing specialist. Compute Remotion frame timings for a multi-panel technical video.

{_CTX["remotion_timing_rules"]}

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "fps": 30,
  "total_frames": <int>,
  "scenes": [
    {{
      "scene_index": <int>,
      "layout": "<layout name>",
      "start_frame": <int>,
      "duration_frames": <int>
    }}
  ]
}}

## TIMING ALGORITHM
1. total_frames = total_seconds x 30
2. Base duration by layout (multi-panel scenes need MORE time to read):
   - "full" (AnimatedTitle intro/outro): 120 frames (4s)
   - "full" (other — QuoteCard, TypewriterText): 150-180 frames (5-6s)
   - "title-content":     210-270 frames (7-9s) — one rich component
   - "left-right":        240-300 frames (8-10s) — two side-by-side panels
   - "title-left-right":  270-330 frames (9-11s) — header + two panels
   - "title-main-sidebar":300-360 frames (10-12s) — three areas to absorb
3. Assign base frames, then scale proportionally so sum == total_frames exactly
4. Minimum: 120 frames for any scene
5. start_frame[0] = 0; start_frame[i] = sum(duration_frames[0..i-1])
6. Adjust last scene to absorb any rounding difference

Return ONLY valid JSON. No markdown.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    total_seconds = director_brief.get("total_seconds", 60)
    logger.info("[%s] Computing timings: %ds @ 30fps", AGENT_NAME, total_seconds)

    scene_lines = "\n".join(
        f"  Scene {s.get('scene_index', i)}: layout={s.get('layout')!r}"
        for i, s in enumerate(script.get("scenes", []))
    )

    user_message = (
        f"total_seconds: {total_seconds}\n"
        f"total_frames: {total_seconds * 30}\n\n"
        f"Scenes:\n{scene_lines}\n\n"
        "Assign duration_frames using the layout-based table above. "
        "Multi-panel layouts need more time — viewers must read multiple areas. "
        "Ensure sum(duration_frames) == total_frames. Return only JSON."
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
            scenes[-1]["duration_frames"] = max(120, scenes[-1].get("duration_frames", 120) + (expected - actual))
        # Recompute start_frames
        cursor = 0
        for s in scenes:
            s["start_frame"] = cursor
            cursor += s.get("duration_frames", 0)
        # Backfill layout from script
        script_scenes = script.get("scenes", [])
        for i, s in enumerate(scenes):
            if i < len(script_scenes):
                s["layout"] = script_scenes[i].get("layout", s.get("layout", "full"))

    logger.info("[%s] ✅ %d frames, %d scenes", AGENT_NAME, expected, len(scenes))
    return timing
