"""
backend/agents/director.py — Agent 1: Director

Responsibilities:
  - Analyse the topic from a system design / technical education perspective.
  - Produce a richly-detailed Director's Brief: visual tone, color palette,
    typography, scene structure, key concepts to cover, and target audience.
  - All downstream agents depend on this brief as their "source of truth".

Output contract (JSON object):
  {
    "topic":        str,
    "target_audience": str,     // e.g. "senior engineers", "CS students"
    "depth_level":  str,        // "introductory" | "intermediate" | "advanced"
    "tone":         str,        // e.g. "technical", "academic", "conversational"
    "palette": {
      "background":   str,      // hex color
      "primary":      str,      // accent / highlight color
      "secondary":    str,
      "text":         str,
      "muted":        str,
      "code_bg":      str
    },
    "typography": {
      "heading_font":   str,    // Google Fonts name
      "body_font":      str,
      "code_font":      str     // e.g. "Fira Code"
    },
    "total_seconds":  int,      // 60–120 for in-depth system design
    "scene_count":    int,      // 6–12 scenes
    "scene_titles":   list[str],
    "key_concepts":   list[str],  // core technical concepts to visualise
    "visual_metaphors": list[str] // e.g. "nodes as circles", "queues as conveyor belts"
  }
"""

import json
import logging

from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)

AGENT_NAME = "Director"

SYSTEM_PROMPT = """
You are a world-class Creative Director and Principal Systems Engineer specializing
in producing deep-dive technical education videos for senior software engineers and
system designers.

Your job is to plan a comprehensive, in-depth video about a system design or
distributed systems concept. This is NOT a surface-level overview — it is a
rigorous, structured exploration of the topic from first principles, covering
trade-offs, real-world implications, and implementation nuances.

You receive a topic string and must output ONLY a JSON object (no markdown fences,
no prose) with this exact structure:

{
  "topic":            "<the topic>",
  "target_audience":  "<e.g. senior engineers, distributed systems practitioners>",
  "depth_level":      "<introductory|intermediate|advanced>",
  "tone":             "<technical|academic|conversational-technical>",
  "palette": {
    "background":  "<dark hex, e.g. #0a0e1a>",
    "primary":     "<vibrant accent hex, e.g. #7c3aed>",
    "secondary":   "<complementary accent hex>",
    "text":        "<near-white hex>",
    "muted":       "<muted text hex>",
    "code_bg":     "<dark code block bg hex>",
    "highlight":   "<highlight color for key terms>",
    "success":     "<green-tone for correct/good states>",
    "danger":      "<red-tone for failure/bad states>"
  },
  "typography": {
    "heading_font": "<Google Fonts name>",
    "body_font":    "<Google Fonts name>",
    "code_font":    "Fira Code"
  },
  "total_seconds":   <int, between 90 and 150>,
  "scene_count":     <int, between 8 and 12>,
  "scene_titles":    ["<title 1>", "...", "<title N>"],
  "key_concepts":    ["<core concept 1>", "..."],
  "visual_metaphors": ["<metaphor 1 for visualisation>", "..."],
  "technical_depth": {
    "cover_internals":    true,
    "show_trade_offs":    true,
    "include_failure_modes": true,
    "show_real_world_examples": true
  }
}

=== SCENE PLANNING RULES ===

Design scenes that progressively build deep understanding:
  1. HOOK — A compelling problem statement or failure scenario. Why does this matter?
  2. NAIVE SOLUTION — The obvious, simple approach and why it breaks at scale.
  3-N. CORE CONCEPTS — Each key component, algorithm, or mechanism gets its own scene.
       Use concrete visual metaphors (nodes, queues, trees, rings, timelines).
  N-1. TRADE-OFFS — CAP theorem implications, latency vs. consistency, etc.
  N. REAL WORLD — How this is used in Kafka, Cassandra, Redis, Kubernetes, etc.

=== VISUAL DESIGN RULES ===
- Use deep, dark backgrounds (near-black with a subtle hue).
- Primary accent: one bold, vibrant color (purple, electric blue, or amber).
- Secondary accent: a complementary contrasting color.
- Use a monospace font (Fira Code) for any code snippets or technical values.
- Fonts must be available on Google Fonts (Inter, Outfit, Space Grotesk, Fira Code, JetBrains Mono).
- total_seconds must be 90–150 to allow in-depth coverage.
- scene_titles length must exactly equal scene_count.
- Return ONLY valid JSON — no markdown fences, no prose.
""".strip()


def run_agent(topic: str) -> dict:
    """
    Run the Director agent for the given topic.

    Args:
        topic: The subject of the educational video (e.g. "Consistent Hashing")

    Returns:
        Parsed director brief as a Python dict.
    """
    logger.info("[%s] Generating director brief for topic: %r", AGENT_NAME, topic)

    user_message = (
        f"Topic: {topic}\n\n"
        "Plan a comprehensive, in-depth technical education video on this system "
        "design topic. Cover the problem, internals, trade-offs, failure modes, and "
        "real-world applications. Target audience: senior engineers."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=2048,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)

    try:
        brief: dict = json.loads(cleaned)
        logger.info(
            "[%s] ✅ Brief ready: %d scenes, %ds video",
            AGENT_NAME,
            brief.get("scene_count"),
            brief.get("total_seconds"),
        )
        return brief
    except json.JSONDecodeError as exc:
        logger.error("[%s] ❌ Failed to parse JSON: %s\nRaw:\n%s", AGENT_NAME, exc, raw)
        raise ValueError(f"Director agent returned invalid JSON: {exc}") from exc
