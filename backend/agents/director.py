"""
backend/agents/director.py — Agent 1: Director

Plans the video: picks layout + panel types per scene.
Multi-panel layouts produce richer, denser educational content.
"""

import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, parse_json_robust

logger = logging.getLogger(__name__)
AGENT_NAME = "Director"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Creative Director for deep-dive technical education videos targeting senior engineers.
Your job: design a scene-by-scene video blueprint that maximises information density, visual variety,
and narrative coherence. Output ONLY a single JSON object — no prose, no markdown fences.

{_CTX["compact_catalog"]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## THEME — pick ONE palette that fits the topic's vibe

OPTION A  (cool tech / networking / distributed systems)
  background=#030711  primary=#6366f1  secondary=#22d3ee  accent=#f59e0b  font="Space Grotesk"

OPTION B  (terminal / systems / low-level / algorithms)
  background=#0a0f1e  primary=#10b981  secondary=#38bdf8  accent=#fb923c  font="Outfit"

OPTION C  (cloud / data / ML / databases)
  background=#050d1a  primary=#8b5cf6  secondary=#34d399  accent=#22d3ee  font="Inter"

OPTION D  (security / infra / Kubernetes / DevOps)
  background=#0d1117  primary=#ef4444  secondary=#f59e0b  accent=#a3e635  font="Space Grotesk"

Choose whichever option's colors contrast well with the topic. Never invent colors outside these palettes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## SCENE COUNT

6-8 scenes for architecture/systems topics.
7-10 scenes for algorithm/narrative topics.
ALL four arrays (scene_titles, scene_subtitles, scene_layouts, scene_panel_plans)
must have EXACTLY scene_count entries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## SCENE STRUCTURE — follow this narrative arc

Scene 0  (Hook / Intro)    → layout="full"  panels=[{{area:"panel",type:"AnimatedTitle"}}]
                              Dramatic title + 1 punchy subtitle that reveals the stakes.

Scene 1  (Why It Matters)  → layout="title-left-right"
                              left=BulletList (what problem this solves + real cost of NOT knowing),
                              right=StatCallout or BarChart (a striking real-world number).

Scene 2  (Core Concept)    → layout="title-left-right" or "title-main-sidebar"
                              Explain the mechanism. Prefer CodeBlock or StepFlow + ArchitectureDiagram.

Scene 3  (Deep Dive A)     → layout="title-main-sidebar"
                              Most complex visual — use ArchitectureDiagram in "main".
                              sidebar=BulletList (trade-offs) or StatCallout (key metric).

Scene 4  (Deep Dive B)     → layout="title-left-right"
                              Contrast or alternative path. BarChart comparisons or ComparisonCard.

Scene 5+ (Synthesis)       → layout="title-left-right" or "title-content"
                              Connect dots — TwoColumnLayout (before/after) or StepFlow (decision flow).

Last     (Insight / Outro) → layout="full"  panels=[{{area:"panel",type:"AnimatedTitle"}}]
                              Reframe the problem with the new understanding. NOT "summary".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## LAYOUT RULES

"title-left-right"   → areas: left + right (each 960×920). DEFAULT for middle scenes.
  Good combos: BulletList+CodeBlock · StepFlow+ArchitectureDiagram · BulletList+BarChart

"title-main-sidebar" → areas: main (1248×920, wide) + sidebar (672×920, narrow).
  main gets the biggest visual. sidebar gets supporting callout.
  Good combos: ArchitectureDiagram+BulletList · TimelineFlow+StatCallout · CodeBlock+BulletList

"title-content"      → area: main (full width below header). Span-worthy components only.
  Use for: ComparisonCard · TwoColumnLayout · TimelineFlow (many events)

"left-right"         → areas: left + right (full height, no header). Max drama. Use ≤1 time.
  Use for: TypewriterText+ArchitectureDiagram · QuoteCard+CodeBlock

"full"               → area: panel. ONLY for scene 0 and last scene.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## DIVERSITY CONSTRAINTS (middle scenes only)

1. BulletList may appear in at most 50% of middle scenes. Use StepFlow, CodeBlock, TwoColumnLayout as alternatives.
2. No two consecutive scenes may have identical (layout, left_type, right_type) tuples.
3. ArchitectureDiagram: required in ≥2 scenes for diagram-driven; optional but ≥1 for narrative.
4. CodeBlock: required in ≥1 scene for any topic with code, config, protocols, or commands.
5. StatCallout: required in ≥1 scene (sidebar is ideal). Use a metric that is surprising or large.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## COMPARISON TOPICS ("X vs Y" or "A or B")

scene_count = 7 EXACTLY. Fixed layout sequence:
  0: full            → AnimatedTitle
  1: title-left-right→ BulletList(X) + BulletList(Y)   [what each IS]
  2: title-main-sidebar → ArchitectureDiagram(X) + StatCallout(key X metric)
  3: title-main-sidebar → ArchitectureDiagram(Y) + StatCallout(key Y metric)
  4: title-content   → ComparisonCard(trade-offs head-to-head)
  5: title-left-right→ BarChart(metric comparison) + BulletList(decision guide)
  6: full            → AnimatedTitle(verdict)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT SCHEMA

{{
  "topic": "<topic string>",
  "depth_level": "introductory" | "intermediate" | "advanced",
  "palette": {{
    "background": "<hex>", "primary": "<hex>", "secondary": "<hex>",
    "accent": "<hex>", "highlight": "<hex>"
  }},
  "typography": {{"heading_font": "<Google Font name>", "body_font": "Inter", "code_font": "Fira Code"}},
  "total_seconds": <60-120>,
  "scene_count": <int>,
  "scene_titles":      ["<title>", ...],
  "scene_subtitles":   ["<one punchy sentence — the scene's thesis>", ...],
  "scene_layouts":     ["<layout>", ...],
  "scene_panel_plans": [[{{"area":"<area>","type":"<Type>"}},...], ...],
  "key_concepts":      ["<concept>", ...]
}}

Return ONLY valid JSON. No markdown, no commentary.
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
        agent_name=AGENT_NAME,
    )

    brief: dict = parse_json_robust(raw, label=AGENT_NAME)

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
