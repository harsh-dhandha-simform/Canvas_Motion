"""
backend/agents/scriptwriter.py — Agent 2: Scriptwriter

Responsibilities:
  - Take the Director's Brief and write a deep, technically rich, scene-by-scene
    voiceover script explaining system design concepts from first principles.
  - Each scene gets narration that a senior engineer would find genuinely insightful.
  - Produces a structured JSON object consumed by the Sync and Code-Generator agents.

Output contract (JSON object):
  {
    "scenes": [
      {
        "scene_index":   int,
        "title":         str,
        "narration":     str,       // 3–5 spoken sentences, deeply technical
        "key_points":    list[str], // 3–5 bullet points for on-screen display
        "technical_terms": list[str], // terms to highlight visually
        "code_snippet":  str | null   // optional pseudocode or config to display
      },
      ...
    ]
  }
"""

import json
import logging

from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)

AGENT_NAME = "Scriptwriter"

SYSTEM_PROMPT = """
You are a Principal Engineer and world-class technical educator who writes scripts for
deep-dive system design videos targeted at senior software engineers and architects.

You receive a Director's Brief (JSON) and must write a scene-by-scene narration that
explains the topic with true technical depth — not surface-level summaries.

Your narration should:
  - Explain the WHY before the HOW (motivation-first teaching).
  - Use precise engineering language: latency, throughput, consensus, replication, sharding, etc.
  - Describe concrete failure scenarios and how the system handles them.
  - Reference real systems (Kafka, Cassandra, ZooKeeper, etcd, Redis, Kubernetes, etc.)
    when illustrating a concept.
  - Build progressive complexity — each scene assumes the viewer understood the previous.

Output ONLY a JSON object (no markdown, no prose) with this exact structure:

{
  "scenes": [
    {
      "scene_index":     <int>,
      "title":           "<scene title>",
      "narration":       "<3–5 spoken sentences of deep technical narration>",
      "key_points":      ["<concise on-screen bullet 1>", "...", "<up to 5 bullets>"],
      "technical_terms": ["<term to highlight>", "..."],
      "code_snippet":    "<optional 3–8 line pseudocode or config, or null>"
    }
  ]
}

=== NARRATION RULES ===
1. Narration must be 3–5 complete spoken sentences per scene.
2. Every narration must teach something a viewer couldn't find in a 30-second summary.
3. For conceptual scenes, explain the internal mechanics (e.g. "The consistent hash ring
   maps keys to a circular key space from 0 to 2^32 - 1. Virtual nodes are inserted at
   multiple positions per physical server to ensure uniform key distribution.")
4. For trade-off scenes, explicitly compare alternatives (latency vs. consistency, etc.)
5. For real-world scenes, name the actual product and why it made this design choice.

=== KEY POINTS RULES ===
1. 3–5 concise bullets per scene, max 10 words each.
2. Written as display text — short, precise, visual-friendly.
3. Start with action verbs or key nouns, not full sentences.

=== CODE SNIPPET RULES ===
1. Include a short (3–8 line) pseudocode or real-world config snippet for conceptual scenes.
2. Use null if the scene is purely conceptual/visual.
3. Format as a single string with \\n for newlines.

scenes array length must exactly match director_brief.scene_count.
Return ONLY valid JSON.
""".strip()


def run_agent(director_brief: dict) -> dict:
    """
    Run the Scriptwriter agent.

    Args:
        director_brief: The parsed output from the Director agent.

    Returns:
        Script dict with per-scene narration, key points, technical terms, and code snippets.
    """
    logger.info("[%s] Writing deep-dive script for topic: %r", AGENT_NAME, director_brief.get("topic"))

    user_message = (
        f"Director's Brief:\n{json.dumps(director_brief, indent=2)}\n\n"
        "Write a technically deep, scene-by-scene narration script. "
        "Each scene should explain concepts from first principles with engineering precision. "
        "Include concrete examples, failure modes, and real-world system references."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=12000,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)

    try:
        script: dict = json.loads(cleaned)
        scene_count = len(script.get("scenes", []))
        logger.info("[%s] ✅ Script written: %d scenes", AGENT_NAME, scene_count)
        return script
    except json.JSONDecodeError as exc:
        logger.error("[%s] ❌ Failed to parse JSON: %s\nRaw:\n%s", AGENT_NAME, exc, raw)
        raise ValueError(f"Scriptwriter agent returned invalid JSON: {exc}") from exc
