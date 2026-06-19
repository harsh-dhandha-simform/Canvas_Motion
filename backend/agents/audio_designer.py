"""
backend/agents/audio_designer.py — Agent 3: Audio Designer

Responsibilities:
  - Design the audio atmosphere that reinforces a serious, in-depth technical tone.
  - Map sound effect (SFX) markers to key visual events in the scene timeline.
  - Produce a structured JSON object consumed by the Code-Generator agent.

Output contract (JSON object):
  {
    "background_music": {
      "genre":       str,
      "bpm":         int,
      "mood":        str,
      "description": str
    },
    "sfx_markers": [
      {
        "scene_index": int,
        "trigger":     str,
        "sound":       str,
        "description": str
      }
    ]
  }
"""

import json
import logging

from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)

AGENT_NAME = "AudioDesigner"

SYSTEM_PROMPT = """
You are a senior audio designer for technical education content targeted at
senior engineers and system designers.

You receive a Director's Brief (JSON) and must design a professional audio atmosphere
that enhances a serious, in-depth system design learning experience.

Output ONLY a JSON object (no markdown, no prose) with this exact structure:

{
  "background_music": {
    "genre":       "<e.g. ambient-electronic|lo-fi-instrumental|cinematic-tech>",
    "bpm":         <int, 60–90 for focused technical content>,
    "mood":        "<e.g. focused|contemplative|tense|triumphant>",
    "description": "<detailed description of the music atmosphere>"
  },
  "sfx_markers": [
    {
      "scene_index": <int>,
      "trigger":     "<what triggers this sound, e.g. 'diagram appears', 'node fails'>",
      "sound":       "<e.g. 'soft-chime', 'keyboard-click', 'network-ping', 'error-buzz', 'success-ding'>",
      "description": "<how it reinforces the concept at this moment>"
    }
  ]
}

=== MUSIC RULES ===
1. Choose music that creates a focused, intellectual atmosphere — NOT upbeat or playful.
2. For system design topics: prefer ambient electronic, minimal piano, or cinematic tech.
3. BPM should be 60–85 for deep-focus content.
4. Mood should match the content arc: start contemplative/curious, build to focused, end with resolution.

=== SFX RULES ===
1. Place SFX at key technical moments: when a diagram appears, a node fails, a consensus is reached.
2. Sound names must be abstract and descriptive (they guide the code generator's placeholders).
3. Include 1–2 SFX per scene for key visual events.
4. Use meaningful sounds that reinforce the concept:
   - Node/server: 'server-hum', 'node-connect', 'node-fail'
   - Data flow: 'packet-send', 'network-ping', 'data-replicate'
   - Success/completion: 'consensus-reached', 'success-chime'
   - Warning/failure: 'partition-warning', 'timeout-buzz', 'error-tone'

Return ONLY valid JSON.
""".strip()


def run_agent(director_brief: dict) -> dict:
    """
    Run the Audio Designer agent.

    Args:
        director_brief: The parsed output from the Director agent.

    Returns:
        Audio design dict with background music and SFX markers.
    """
    logger.info("[%s] Designing audio for topic: %r", AGENT_NAME, director_brief.get("topic"))

    user_message = (
        f"Director's Brief:\n{json.dumps(director_brief, indent=2)}\n\n"
        "Design an audio atmosphere that reinforces in-depth technical learning. "
        "The music should create a focused, intellectual environment suitable for "
        "explaining serious system design concepts to senior engineers."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.6,
        max_tokens=2048,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)

    try:
        audio_design: dict = json.loads(cleaned)
        sfx_count = len(audio_design.get("sfx_markers", []))
        logger.info("[%s] ✅ Audio design done: %d SFX markers", AGENT_NAME, sfx_count)
        return audio_design
    except json.JSONDecodeError as exc:
        logger.error("[%s] ❌ Failed to parse JSON: %s\nRaw:\n%s", AGENT_NAME, exc, raw)
        raise ValueError(f"AudioDesigner agent returned invalid JSON: {exc}") from exc
