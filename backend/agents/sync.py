"""
backend/agents/sync.py — Agent 5: Text-Timing Sync Specialist

Responsibilities:
  - Take the Script and Director's Brief (total_seconds, scene_count).
  - Divide the total frame budget across scenes proportionally by narration length.
  - Account for intro/outro padding and transition frames.
  - Produce frame-accurate timing for each scene and subtitle word-chunk.
  - Output timing JSON consumed by the Code-Generator to set
    `from` / `durationInFrames` values on Remotion `<Sequence>` tags.

Output contract (JSON object):
  {
    "fps": 30,
    "total_frames": int,
    "scenes": [
      {
        "scene_index":      int,
        "start_frame":      int,
        "duration_frames":  int,
        "intro_hold_frames": int,  // frames before narration begins (diagram appears)
        "outro_hold_frames": int,  // frames after narration ends (diagram lingers)
        "subtitle_chunks":  [
          {
            "text":          str,
            "start_frame":   int,
            "duration_frames": int
          }
        ]
      }
    ]
  }
"""

import json
import logging

from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)

AGENT_NAME = "SyncSpecialist"

SYSTEM_PROMPT = """
You are a video timing specialist for long-form technical educational content.
Your job is to compute precise Remotion frame timings for a multi-scene system
design video — scenes are 60–150 seconds long in total.

Given a Director's Brief and a Script, output ONLY a JSON timing plan
(no markdown, no prose) using this exact structure:

{
  "fps": 30,
  "total_frames": <int>,
  "scenes": [
    {
      "scene_index":       <int>,
      "start_frame":       <int>,
      "duration_frames":   <int>,
      "intro_hold_frames": <int, 15–45 frames before narration starts>,
      "outro_hold_frames": <int, 15–30 frames after narration ends>,
      "subtitle_chunks": [
        {
          "text":            "<3–6 word subtitle chunk>",
          "start_frame":     <int, relative to scene start_frame>,
          "duration_frames": <int>
        }
      ]
    }
  ]
}

=== TIMING RULES ===
- fps is always 30.
- total_frames = director_brief.total_seconds * 30.
- Divide frames proportionally among scenes based on narration text length (word count).
  Longer narration = more frames. Scenes with complex diagrams get an extra 20–30 frame bonus.
- intro_hold_frames: 15–45 frames at the start of each scene BEFORE subtitles begin.
  Use 30–45 frames for scenes with complex diagrams (gives time for the diagram to appear).
  Use 15–20 frames for text-heavy scenes.
- outro_hold_frames: 15–30 frames AFTER the last subtitle, before scene transition.
- subtitle_chunk start_frame values are RELATIVE to the scene's start_frame
  (NOT absolute frame positions).
- subtitle_chunk start_frame for the first chunk = intro_hold_frames.
- Every scene must have at least 3 subtitle chunks.
- Subtitle chunks should be 3–6 words each.
- Reading pace: approximately 80–100 words per minute.
  At 30fps: 1 word ≈ 18–23 frames. Each chunk duration = word_count × 20 frames.
- Minimum scene duration: 90 frames (3 seconds). Typical: 180–450 frames.
- start_frame for scene 0 is always 0.
- Each scene's start_frame = sum of all previous scenes' duration_frames.
- The sum of all duration_frames must equal total_frames exactly.

=== DIAGRAM-DRIVEN ARC RULES ===
When director_brief.arc_type == "diagram-driven" (architecture/scaling/comparison topics):
- scene_count will be 5–7 (much fewer scenes than a narrative arc).
- Each scene gets a LARGER frame budget since there are fewer scenes.
- Allow individual scenes up to 600 frames (20s) for diagram-heavy scenes.
- ArchitectureDiagram scenes: 240–360 frames minimum.
- AnimatedTitle scenes (intro/outro): 120–180 frames.
- SplitScreen and ComparisonCard scenes: 180–270 frames.

Return ONLY valid JSON.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    """
    Run the Sync Specialist agent.

    Args:
        director_brief: Parsed output from the Director agent.
        script:         Parsed output from the Scriptwriter agent.

    Returns:
        Timing dict with frame-accurate scene and subtitle timings.
    """
    logger.info(
        "[%s] Computing timings for %ds video @ 30fps",
        AGENT_NAME,
        director_brief.get("total_seconds", "?"),
    )

    # Prune inputs to minimize prompt size (avoiding Groq TPM limits / 413 Payload Too Large)
    pruned_brief = {
        "topic": director_brief.get("topic"),
        "arc_type": director_brief.get("arc_type", "narrative"),
        "total_seconds": director_brief.get("total_seconds"),
        "scene_count": director_brief.get("scene_count"),
    }
    pruned_script = {
        "scenes": [
            {
                "scene_index": s.get("scene_index"),
                "title": s.get("title"),
                "narration": s.get("narration"),
            }
            for s in script.get("scenes", [])
        ]
    }

    user_message = (
        f"Director's Brief:\n{json.dumps(pruned_brief, separators=(',', ':'))}\n\n"
        f"Script:\n{json.dumps(pruned_script, separators=(',', ':'))}\n\n"
        "Compute frame-accurate timing for this long-form technical video. "
        "Ensure scenes with complex system design diagrams get intro_hold_frames "
        "of 30–45 frames so the diagrams have time to animate in before narration begins."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,  # Very low temperature — deterministic math output
        max_tokens=12000,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)

    try:
        timing: dict = json.loads(cleaned)
        total = timing.get("total_frames", "?")
        scene_count = len(timing.get("scenes", []))
        logger.info(
            "[%s] ✅ Timing plan: %s total frames, %d scenes",
            AGENT_NAME,
            total,
            scene_count,
        )
        return timing
    except json.JSONDecodeError as exc:
        logger.error("[%s] ❌ Failed to parse JSON: %s\nRaw:\n%s", AGENT_NAME, exc, raw)
        raise ValueError(f"SyncSpecialist agent returned invalid JSON: {exc}") from exc
