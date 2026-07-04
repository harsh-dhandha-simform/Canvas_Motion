import logging
import json
from typing import Any
from utils.api import chat_completion, parse_json_robust

logger = logging.getLogger(__name__)

def generate_interaction_cues(video_script: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Generate 1-3 interactive cues for a VideoScript using the LLM.
    """
    scenes = video_script.get("scenes", [])
    if not scenes:
        return []

    # Build a concise script summary for the LLM
    scenes_summary = []
    for idx, scene in enumerate(scenes):
        panels = scene.get("panels", [])
        panel_desc = [f"  - Area '{p.get('area')}': Component '{p.get('type')}'" for p in panels]
        scenes_summary.append(
            f"Slide {idx} (Title: {scene.get('title')}, Duration: {scene.get('duration_frames', 150) / 30}s):\n"
            f"Narration: {scene.get('narration')}\n"
            f"Visual Layout: {scene.get('layout')}\n"
            f"Panels:\n" + "\n".join(panel_desc)
        )

    scenes_text = "\n\n".join(scenes_summary)
    divider = "=" * 40
    prompt = f"""
You are an instructional designer. Given the following educational video script (containing narration and visual panels), generate 1 to 3 interactive learning cues to keep students engaged.

Cues can be of three types:
1. 'quiz': A multiple-choice question. Payload must contain:
   {{"question": "string", "options": ["option1", "option2", ...], "correctAnswer": number (0-based index), "explanation": "string"}}
2. 'send_request': Simulate sending a network request. Payload must contain:
   {{"endpoint": "string", "method": "string", "explanation": "string"}}
3. 'simulate_mutation': Simulate a state change or mutation. Payload must contain:
   {{"variable": "string", "oldValue": any, "newValue": any, "explanation": "string"}}

Rules:
- Place cues at logical break points: 'slide_start' (right when a slide transitions in) or 'slide_end' (right before it transitions out).
- Do not trigger more than one cue per slide.
- Return ONLY a valid JSON list of interaction cues matching this schema:
[
  {{
    "id": "cue_unique_id",
    "slideIndex": number (0-based index of the slide, must be between 0 and {len(scenes) - 1}),
    "triggerAt": "slide_start" | "slide_end",
    "concept": "Name of concept tested",
    "type": "quiz" | "send_request" | "simulate_mutation",
    "payload": {{ ... }}
  }}
]

Video Script Title: {video_script.get('title')}
Scenes:
{divider}
{scenes_text}
"""

    system_prompt = "You are a helpful assistant that generates educational interaction cues."
    
    try:
        logger.info("[cues] Requesting interaction cues from LLM...")
        raw_response = chat_completion(
            [{"role": "user", "content": prompt}],
            agent_name="interaction_designer"
        )
        cues = parse_json_robust(raw_response, label="interaction_designer")
        if not isinstance(cues, list):
            logger.warning("[cues] LLM response was not a list, defaulting to empty list.")
            return []
        
        # Validate slideIndex and calculate triggerAtSec
        validated_cues = []
        cursor_frames = 0
        scene_times = []
        for scene in scenes:
            from_frame = cursor_frames
            dur = scene.get("duration_frames", 150)
            cursor_frames += dur
            scene_times.append((from_frame / 30.0, (from_frame + dur) / 30.0))

        for cue in cues:
            try:
                slide_idx = int(cue.get("slideIndex", 0))
                if slide_idx < 0 or slide_idx >= len(scenes):
                    continue
                
                trigger = cue.get("triggerAt", "slide_start")
                if trigger not in ("slide_start", "slide_end"):
                    trigger = "slide_start"
                
                start_sec, end_sec = scene_times[slide_idx]
                trigger_sec = start_sec if trigger == "slide_start" else end_sec

                validated_cues.append({
                    "id": cue.get("id") or f"cue_{slide_idx}_{cue.get('type')}",
                    "slideIndex": slide_idx,
                    "triggerAt": trigger,
                    "concept": cue.get("concept") or "Interactive Checkpoint",
                    "type": cue.get("type") or "quiz",
                    "payload": cue.get("payload") or {},
                    "triggerAtSec": round(trigger_sec, 2)
                })
            except Exception as e:
                logger.warning("[cues] Error parsing cue object: %s", e)
                continue
                
        return validated_cues
    except Exception as e:
        logger.error("[cues] Failed to generate interaction cues: %s", e)
        return []
