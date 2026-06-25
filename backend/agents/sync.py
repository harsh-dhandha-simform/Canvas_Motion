"""
backend/agents/sync.py — Agent 4: Sync Specialist

Component-aware timing with multi-panel layout consideration.
Multi-panel scenes need more time since there's more content to absorb.
"""

import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, parse_json_robust

logger = logging.getLogger(__name__)
AGENT_NAME = "SyncSpecialist"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a video timing specialist. Your job is to assign a duration_frames to each scene so that:
  (a) viewers have enough time to absorb every panel's content,
  (b) the video never drags — no scene overstays its welcome,
  (c) sum(duration_frames) == total_seconds × 30 EXACTLY.

{_CTX["remotion_timing_rules"]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT SCHEMA (return ONLY this JSON, no markdown)

{{
  "fps": 30,
  "total_frames": <total_seconds × 30>,
  "scenes": [
    {{
      "scene_index": <int 0-based>,
      "layout": "<layout name>",
      "start_frame": <int>,
      "duration_frames": <int>
    }}
  ]
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TIMING ALGORITHM — follow exactly

Step 1: total_frames = total_seconds × 30

Step 2: Assign a BASE duration to each scene using this table:

  Layout                  Panel count  Component types             Base (frames)
  ─────────────────────────────────────────────────────────────────────────────
  full + AnimatedTitle    1            intro/outro                 120
  full + other            1            QuoteCard, TypewriterText   150
  title-content           1            ComparisonCard, Timeline    240
  title-left-right        2            any combo                   300
  title-main-sidebar      2            any combo (more to absorb)  330
  left-right              2            dramatic split              270
  ─────────────────────────────────────────────────────────────────────────────

  Adjustments within a scene:
  • ArchitectureDiagram present? +30 frames (nodes animate in staggered — takes time)
  • CodeBlock present?           +30 frames (code needs reading time)
  • BarChart OR TimelineFlow?    +15 frames
  • StatCallout only (sidebar)?  -15 frames (quick read)
  • Two BulletLists?             +15 frames (more text)

Step 3: raw_total = sum of all base durations
        scale_factor = total_frames / raw_total

Step 4: scaled_duration[i] = round(base[i] × scale_factor)
        Clamp each to minimum 120 frames.

Step 5: diff = total_frames - sum(scaled_duration)
        Add diff to the LARGEST non-outro scene (not scene 0 or last scene).
        If no middle scene exists, add to last scene.

Step 6: start_frame[0] = 0
        start_frame[i] = sum(duration_frames[0..i-1])

Step 7: Verify: sum(duration_frames) == total_frames. If not, re-check Step 5.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## EXAMPLE (60-second video, 4 scenes)

Input: total_seconds=60, scenes=[
  {{scene_index:0, layout:"full",              components:["AnimatedTitle"]}},
  {{scene_index:1, layout:"title-left-right",  components:["BulletList","CodeBlock"]}},
  {{scene_index:2, layout:"title-main-sidebar",components:["ArchitectureDiagram","BulletList"]}},
  {{scene_index:3, layout:"full",              components:["AnimatedTitle"]}}
]

Step 2 bases:  120, 300+30=330, 330+30=360, 120
Step 3:        raw_total = 930
Step 4:        scale = 1800/930 = 1.935
               scaled: 232, 639, 697, 232
Step 5:        sum = 1800 ✓ (happens to be exact; otherwise adjust scene 2)
Step 6:        starts: 0, 232, 871, 1568

Output:
  total_frames: 1800
  scenes: [
    {{scene_index:0, layout:"full",               start_frame:0,    duration_frames:232}},
    {{scene_index:1, layout:"title-left-right",   start_frame:232,  duration_frames:639}},
    {{scene_index:2, layout:"title-main-sidebar", start_frame:871,  duration_frames:697}},
    {{scene_index:3, layout:"full",               start_frame:1568, duration_frames:232}}
  ]

Return ONLY valid JSON. No markdown, no explanation.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    total_seconds = director_brief.get("total_seconds", 60)
    logger.info("[%s] Computing timings: %ds @ 30fps", AGENT_NAME, total_seconds)

    scene_lines = "\n".join(
        "  Scene {idx}: layout={layout!r}  components=[{comps}]".format(
            idx=s.get("scene_index", i),
            layout=s.get("layout", "full"),
            comps=", ".join(p.get("type", "?") for p in s.get("panels", [])),
        )
        for i, s in enumerate(script.get("scenes", []))
    )

    user_message = (
        f"total_seconds: {total_seconds}\n"
        f"total_frames: {total_seconds * 30}\n\n"
        f"Scenes (with component types for timing adjustments):\n{scene_lines}\n\n"
        "Apply the algorithm from the system prompt step by step. "
        "Verify sum(duration_frames) == total_frames before returning. "
        "Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
        agent_name=AGENT_NAME,
    )

    timing: dict = parse_json_robust(raw, label=AGENT_NAME)

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
