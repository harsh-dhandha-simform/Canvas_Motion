"""
backend/agents/director.py — Agent 1: Director

Plans the video: picks layout + panel types per scene.
Multi-panel layouts produce richer, denser educational content.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Director"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Creative Director for deep-dive technical education videos.
Plan a video structure and output ONLY a JSON object.

{_CTX["compact_catalog"]}

## THEME GUIDELINES
Pick a dark, high-contrast color theme from this palette family:
  background: extremely dark — #030711 | #050d1a | #0a0118 | #020617
  primary:    bold saturated — #6366f1 | #8b5cf6 | #0ea5e9 | #10b981 | #f59e0b
  secondary:  complementary — #34d399 | #a78bfa | #38bdf8 | #fb923c
  accent:     bright pop    — #f59e0b | #22d3ee | #ec4899 | #a3e635
  font: "Inter" | "Space Grotesk" | "Outfit"
Make themes varied and NEVER use the same colors twice.

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "topic": "<the topic>",
  "arc_type": "<diagram-driven|narrative>",
  "target_audience": "senior engineers",
  "depth_level": "<introductory|intermediate|advanced>",
  "tone": "conversational-technical",
  "palette": {{
    "background": "<dark hex>",
    "primary": "<bold hex>",
    "secondary": "<hex>",
    "accent": "<hex>",
    "highlight": "<hex>"
  }},
  "typography": {{
    "heading_font": "<Google Fonts name>",
    "body_font": "Inter",
    "code_font": "Fira Code"
  }},
  "total_seconds": <int 60-150>,
  "scene_count": <int>,
  "scene_titles":    ["<scene title>", "..."],
  "scene_subtitles": ["<1 punchy sentence describing the scene>", "..."],
  "scene_layouts":   ["<layout name>", "..."],
  "scene_panel_plans": [
    [
      {{"area": "<area>", "type": "<ComponentName>"}},
      ...
    ],
    ...
  ],
  "key_concepts": ["<concept>", "..."]
}}

## ARC TYPE RULES
diagram-driven: scaling, architecture, distributed systems, "X vs Y" comparisons,
  load balancing, sharding, Kafka, Kubernetes, CDN, databases, API gateways.
narrative: algorithms, history, theory, patterns, concepts — everything else.

## SCENE COUNT
diagram-driven: 5-7 scenes.
narrative: 7-12 scenes.
scene_titles, scene_subtitles, scene_layouts, and scene_panel_plans must ALL have the same length.

## LAYOUT SELECTION PER SCENE

Scene 0 (intro):   MUST use layout="full",  panels=[{{"area":"panel","type":"AnimatedTitle"}}]
Last scene (outro): MUST use layout="full", panels=[{{"area":"panel","type":"AnimatedTitle"}}]

Middle scenes — pick the DENSEST layout that fits the content:

  "title-left-right"   → BEST for most scenes. Puts explanation + diagram/chart side by side.
    panel areas: "left" + "right"
    Example: left=StepFlow, right=ArchitectureDiagram
    Example: left=BulletList, right=BarChart
    Example: left=BulletList, right=CodeBlock

  "title-main-sidebar" → When one visual needs more space (diagram + supporting bullets).
    panel areas: "main" + "sidebar"
    Example: main=ArchitectureDiagram, sidebar=BulletList
    Example: main=TimelineFlow, sidebar=StatCallout

  "title-content"      → When one component is rich enough alone.
    panel areas: "main"
    Example: main=ComparisonCard  (pros/cons spans the width)
    Example: main=TwoColumnLayout

  "left-right"         → When you want a dramatic full-height split (no header needed).
    panel areas: "left" + "right"
    Example: left=TypewriterText, right=ArchitectureDiagram
    Use sparingly — 1-2 times max per video.

## PANEL DIVERSITY RULES (apply to all middle scenes):
1. diagram-driven arc: each scene MUST have ArchitectureDiagram in at least 2 scenes.
2. narrative arc: spread components across BulletList, StepFlow, CodeBlock, BarChart, StatCallout, ArchitectureDiagram.
3. No two consecutive scenes can have identical panel type combinations.
4. At least 60% of scenes must use "title-left-right" or "title-main-sidebar" (the dense layouts).
5. StatCallout: include in at least 1 sidebar to highlight a key metric.

## COMPARISON TOPICS ("X vs Y"):
scene_count = 6 EXACTLY. Use these layouts and types:
  Scene 0: layout="full",             panels=[{{"area":"panel","type":"AnimatedTitle"}}]
  Scene 1: layout="title-left-right", panels=[{{"area":"left","type":"BulletList"}},{{"area":"right","type":"ComparisonCard"}}]
  Scene 2: layout="title-main-sidebar",panels=[{{"area":"main","type":"ArchitectureDiagram"}},{{"area":"sidebar","type":"BulletList"}}]
  Scene 3: layout="title-main-sidebar",panels=[{{"area":"main","type":"ArchitectureDiagram"}},{{"area":"sidebar","type":"StatCallout"}}]
  Scene 4: layout="title-left-right", panels=[{{"area":"left","type":"BarChart"}},{{"area":"right","type":"ComparisonCard"}}]
  Scene 5: layout="full",             panels=[{{"area":"panel","type":"AnimatedTitle"}}]

Return ONLY valid JSON. No markdown fences, no prose.
""".strip()


def run_agent(topic: str) -> dict:
    logger.info("[%s] Planning video for topic: %r", AGENT_NAME, topic)

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Topic: {topic}\n\n"
                "Plan a rich, educational technical video. "
                "Maximize scene density — use multi-panel layouts for all middle scenes. "
                "Return only JSON."
            )},
        ],
        temperature=0.7,
        max_tokens=3000,
        agent_name=AGENT_NAME,
    )

    brief: dict = json.loads(extract_json(raw))

    # Validate array lengths match scene_count
    n = brief.get("scene_count", 0)
    for key in ("scene_titles", "scene_subtitles", "scene_layouts", "scene_panel_plans"):
        items = brief.get(key, [])
        if len(items) < n:
            logger.warning("[%s] %s has %d items, expected %d — padding", AGENT_NAME, key, len(items), n)
        brief[key] = items[:n]  # trim to scene_count

    logger.info(
        "[%s] ✅ Brief: %d scenes, layouts=%s",
        AGENT_NAME, n, brief.get("scene_layouts"),
    )
    return brief
