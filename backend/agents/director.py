"""
backend/agents/director.py — Agent 1: Director

Outputs scene_types[] (one component name per scene) alongside scene_titles[].
All downstream agents read scene_types to make component-aware decisions.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Director"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Creative Director for technical education videos.
Plan a video about a system design topic and output ONLY a JSON object.

{_CTX["compact_catalog"]}

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "topic": "<the topic>",
  "arc_type": "<diagram-driven|narrative>",
  "target_audience": "<e.g. senior engineers>",
  "depth_level": "<introductory|intermediate|advanced>",
  "tone": "<technical|academic|conversational-technical>",
  "palette": {{
    "background": "<dark hex>",
    "primary": "<vibrant accent hex>",
    "secondary": "<complementary hex>",
    "highlight": "<highlight hex>",
    "text": "<near-white hex>"
  }},
  "typography": {{
    "heading_font": "<Google Fonts name e.g. Inter>",
    "body_font": "<Google Fonts name>",
    "code_font": "Fira Code"
  }},
  "total_seconds": <int 60-150>,
  "scene_count": <int>,
  "scene_titles": ["<title 1>", "...", "<title N>"],
  "scene_types":  ["<ComponentName 1>", "...", "<ComponentName N>"],
  "key_concepts": ["<concept>", "..."],
  "visual_metaphors": ["<metaphor>", "..."]
}}

## ARC TYPE RULES
diagram-driven: scaling, architecture, distributed systems, "X vs Y" comparisons,
  load balancing, sharding, databases, caching, Kafka, Kubernetes, CDN, API gateway.
narrative: algorithms, history, theory, soft skills — everything else.

## SCENE COUNT
diagram-driven: scene_count = 6 (exactly, for comparison topics) or 5-7.
narrative: scene_count = 6-10.

## SCENE TYPE SELECTION — CRITICAL RULES

scene_types[] must be the same length as scene_titles[].
Each entry must be one of the 13 EXACT component names listed above.

### Comparison topics ("X vs Y", "X versus Y", "X compared to Y"):
scene_types MUST be exactly:
  ["AnimatedTitle", "SplitScreen", "ArchitectureDiagram", "ArchitectureDiagram", "ComparisonCard", "AnimatedTitle"]

### Narrative arc (6-10 scenes) — diversity rules (ALL must be satisfied):
  1. scene_types[0]  -> always "AnimatedTitle"
  2. scene_types[-1] -> always "AnimatedTitle"
  3. At least 40% of scenes must be TEXT-BASED:
     BulletList | StepFlow | SplitScreen | ComparisonCard | CodeBlock | TwoColumnLayout | TypewriterText | QuoteCard
  4. No more than 2 consecutive "ArchitectureDiagram" entries
  5. Use at least 3 DIFFERENT component types across all scenes

### Diagram-driven non-comparison (5-7 scenes):
  scene_types[0]  -> "AnimatedTitle"
  scene_types[-1] -> "AnimatedTitle"
  Middle scenes: mix of ArchitectureDiagram, BulletList, SplitScreen, ComparisonCard
  At least 2 non-ArchitectureDiagram scenes in the middle

Return ONLY valid JSON. No markdown fences, no prose.
""".strip()


def run_agent(topic: str) -> dict:
    logger.info("[%s] Planning video for topic: %r", AGENT_NAME, topic)

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Topic: {topic}\n\nPlan a comprehensive technical video. Return only JSON."},
        ],
        temperature=0.7,
        max_tokens=2048,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)
    brief: dict = json.loads(cleaned)

    # Validate scene_types length matches scene_titles
    titles = brief.get("scene_titles", [])
    types = brief.get("scene_types", [])
    if len(types) != len(titles):
        logger.warning(
            "[%s] scene_types length %d != scene_titles length %d — fixing",
            AGENT_NAME, len(types), len(titles),
        )
        while len(types) < len(titles):
            types.append("BulletList")
        brief["scene_types"] = types[:len(titles)]

    logger.info(
        "[%s] ✅ Brief: %d scenes, types=%s",
        AGENT_NAME, brief.get("scene_count"), brief.get("scene_types"),
    )
    return brief
