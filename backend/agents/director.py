"""
backend/agents/director.py — Agent 1: Director

Responsibilities:
  - Analyse the topic from a system design / technical education perspective.
  - Produce a richly-detailed Director's Brief: visual tone, color palette,
    typography, scene structure, key concepts to cover, and target audience.
  - Classify the topic as diagram-driven or narrative arc.
  - All downstream agents depend on this brief as their "source of truth".

Output contract (JSON object):
  {
    "topic":        str,
    "arc_type":     str,         // "diagram-driven" | "narrative"
    "target_audience": str,     // e.g. "senior engineers", "CS students"
    "depth_level":  str,        // "introductory" | "intermediate" | "advanced"
    "tone":         str,        // e.g. "technical", "academic", "conversational"
    "palette": { ... },
    "typography": { ... },
    "total_seconds":  int,
    "scene_count":    int,      // 5-7 for diagram-driven, 6-12 for narrative
    "scene_titles":   list[str],
    "key_concepts":   list[str],
    "visual_metaphors": list[str]
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
  "arc_type":         "<diagram-driven|narrative>",
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
  "total_seconds":   <int, between 60 and 150>,
  "scene_count":     <int — see rules below>,
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

=== TOPIC CLASSIFICATION RULES ===

First, determine arc_type based on the topic:

  arc_type = "diagram-driven" if the topic involves any of:
    - Scaling, architecture, infrastructure, distributed systems
    - Load balancing, sharding, replication, consensus
    - A comparison of two technologies/approaches ("X vs Y", "X versus Y", "X compared to Y")
    - System topologies (Kafka, Kubernetes, Cassandra, Redis, CDN, API gateway, service mesh)
    - Database design, caching strategies, message queues

  arc_type = "narrative" for all other topics (algorithms, history, theory, soft skills).

=== SCENE COUNT RULES ===

  If arc_type == "diagram-driven":
    - scene_count MUST be 5, 6, or 7
    - For "X vs Y" comparison topics: scene_count = 6 exactly
    - scene_titles must follow this template for comparisons:
        1. "<Hook Title>" (AnimatedTitle intro)
        2. "The Core Dilemma" or "The Problem" (SplitScreen with context)
        3. "<Approach A> Architecture" (ArchitectureDiagram)
        4. "<Approach B> Architecture" (ArchitectureDiagram)
        5. "Trade-off Analysis" or "Head-to-Head" (ComparisonCard)
        6. "Key Takeaways" or "When to Choose What" (AnimatedTitle outro)

  If arc_type == "narrative":
    - scene_count between 6 and 12
    - Design scenes that progressively build deep understanding

=== GENERAL SCENE PLANNING RULES ===

For narrative arc:
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
