"""
backend/utils/topic_classifier.py

Lightweight, deterministic topic classification — no LLM calls.
Used to detect comparison topics and recommend frontend components.
"""
from __future__ import annotations
import re

# ---------------------------------------------------------------------------
# "vs" / comparison patterns
# ---------------------------------------------------------------------------
_VS_PATTERNS = [
    r"\bvs\.?\b",
    r"\bversus\b",
    r"\bcompared to\b",
    r"\bvs\b",
]

_COMPARISON_KEYWORDS = [
    "horizontal scaling",
    "vertical scaling",
    "scale up",
    "scale out",
    "sql vs nosql",
    "relational vs",
    "monolith vs",
    "microservice vs",
    "rest vs graphql",
    "kafka vs rabbitmq",
    "synchronous vs",
    "asynchronous vs",
    "push vs pull",
    "read replica",
    "sharding vs",
    "replication vs",
    "cap theorem",
    "consistency vs",
    "latency vs",
]


# Forced scene-type sequence for comparison topics (A vs B)
COMPARISON_SCENE_SEQUENCE = [
    "AnimatedTitle",       # 1: intro title card
    "SplitScreen",         # 2: problem / context (the dilemma)
    "ArchitectureDiagram", # 3: approach A (topology)
    "ArchitectureDiagram", # 4: approach B (topology)
    "ComparisonCard",      # 5: trade-offs / pros & cons
    "AnimatedTitle",       # 6: takeaway / outro
]

# Storyboard element type → recommended frontend component
ELEMENT_TYPE_TO_COMPONENT: dict[str, str] = {
    "node_network":  "ArchitectureDiagram",
    "hash_ring":     "ArchitectureDiagram",
    "data_flow":     "ArchitectureDiagram",
    "state_machine": "ArchitectureDiagram",
    "svg_diagram":   "ArchitectureDiagram",
    "code_block":    "SplitScreen",
    "bar_chart":     "BarChart",
    "counter":       "StatCallout",
    "progress_bar":  "StatCallout",
    "timeline":      "TimelineFlow",
    "arrow_flow":    "StepFlow",
    "data_table":    "TwoColumnLayout",
    "text_block":    "AnimatedTitle",
}

LAYOUT_TO_COMPONENT: dict[str, str] = {
    "diagram":     "ArchitectureDiagram",
    "split":       "SplitScreen",
    "comparison":  "ComparisonCard",
    "quote":       "QuoteCard",
    "stat":        "StatCallout",
    "step":        "StepFlow",
    "timeline":    "TimelineFlow",
    "bar":         "BarChart",
    "code":        "SplitScreen",
    "typewriter":  "TypewriterText",
    "two-column":  "TwoColumnLayout",
    "full-width":  "AnimatedTitle",
    "centered":    "AnimatedTitle",
}


def recommend_component_for_scene(storyboard_scene: dict) -> list[str]:
    """
    Given one storyboard scene dict, return a ranked list of recommended
    frontend component names (most specific first).
    """
    recommendations: list[str] = []

    # 1. Layout string heuristic
    layout: str = storyboard_scene.get("layout", "").lower()
    for kw, component in LAYOUT_TO_COMPONENT.items():
        if kw in layout:
            if component not in recommendations:
                recommendations.append(component)

    # 2. Element type heuristic
    for element in storyboard_scene.get("elements", []):
        etype = element.get("type", "")
        comp = ELEMENT_TYPE_TO_COMPONENT.get(etype)
        if comp and comp not in recommendations:
            recommendations.append(comp)

    # Dedupe, keep order
    seen: set[str] = set()
    result: list[str] = []
    for r in recommendations:
        if r not in seen:
            seen.add(r)
            result.append(r)

    return result or ["AnimatedTitle"]
