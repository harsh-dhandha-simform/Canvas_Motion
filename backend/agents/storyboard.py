"""
backend/agents/storyboard.py — Agent 3: Storyboard

Provides:
  - transition + background_variant per scene
  - visual_data (nodes/bars/events) for diagram/chart panels, keyed by panel area
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Storyboard"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Visual Data Designer for a multi-panel technical education video.

{_CTX["compact_catalog"]}

## YOUR JOB
For each scene, produce:
  1. transition (scene-level)
  2. background_variant (scene-level)
  3. panel_visual_data: a map of area -> visual_data for diagram/chart panels

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "scenes": [
    {{
      "scene_index": <int>,
      "transition": "<fade|slideLeft|slideUp|zoom|none>",
      "background_variant": "<gradient|grid|dark_blueprint|mesh|solid>",
      "panel_visual_data": {{
        "<area>": {{ ... visual data for that panel ... }},
        ...
      }}
    }}
  ]
}}

## PANEL VISUAL DATA RULES

### ArchitectureDiagram panels — panel_visual_data["<area>"] must contain:
{{
  "nodes": [
    {{"id": "lb",      "type": "loadBalancer", "x": 15,  "y": 50,  "label": "Load Balancer"}},
    {{"id": "svc1",   "type": "server",       "x": 45,  "y": 25,  "label": "Service A"}},
    {{"id": "svc2",   "type": "server",       "x": 45,  "y": 75,  "label": "Service B"}},
    {{"id": "db",     "type": "database",     "x": 80,  "y": 50,  "label": "PostgreSQL"}},
    {{"id": "client", "type": "client",       "x": 5,   "y": 50,  "label": "Client"}}
  ],
  "connections": [
    {{"fromId": "client", "toId": "lb",   "type": "arrow"}},
    {{"fromId": "lb",     "toId": "svc1", "type": "arrow"}},
    {{"fromId": "lb",     "toId": "svc2", "type": "arrow"}},
    {{"fromId": "svc1",   "toId": "db",   "type": "stream"}},
    {{"fromId": "svc2",   "toId": "db",   "type": "stream"}}
  ]
}}
Rules:
  - nodes[] MUST have 3-8 entries (never empty or fewer than 3)
  - id: unique, short, no spaces
  - type: exactly "client" | "server" | "loadBalancer" | "database"
  - x, y: float 0-100 (percent of the diagram area). Spread spatially:
      clients at x≈5-15 (left), load balancers at x≈30-40, servers at x≈55-65, databases at x≈80-90
      Use y to spread vertically: multiple servers at y=20,50,80; single nodes at y=50
  - Every node must appear in at least one connection
  - Use "stream" for continuous data flows (writes, replication), "arrow" for request/response

### BarChart panels — panel_visual_data["<area>"] must contain:
{{
  "bars": [
    {{"label": "Option A", "value": 120.0, "color": "#6366f1"}},
    {{"label": "Option B", "value": 45.0,  "color": "#10b981"}},
    {{"label": "Option C", "value": 280.0, "color": "#f59e0b"}}
  ]
}}
  - 4-6 bars with ACCURATE values matching the topic (latency ms, req/s, GB, %)
  - Colors should vary and contrast

### TimelineFlow panels — panel_visual_data["<area>"] must contain:
{{
  "events": [
    {{"year": "2003", "label": "Google GFS paper", "description": "Distributed file system for petabyte-scale data"}},
    {{"year": "2006", "label": "Amazon Dynamo",   "description": "Always-write availability with eventual consistency"}}
  ]
}}
  - 4-6 events in strict chronological order
  - Descriptions: 1 meaningful sentence each (not just a label)

### All other panels — DO NOT include them in panel_visual_data
  Only ArchitectureDiagram, BarChart, and TimelineFlow panels need visual data.

## TRANSITION RULES
- "fade":      intro (scene 0), reflective scenes, stat reveals
- "slideLeft": sequential content scenes (most common)
- "slideUp":   after a comparison, before a key reveal
- "zoom":      use ONCE for the most important insight scene
- "none":      ONLY the very last scene
- No 3 consecutive identical transitions

## BACKGROUND RULES
- "gradient":      intro/outro AnimatedTitle, QuoteCard scenes
- "grid":          ArchitectureDiagram-heavy scenes (has right diagram)
- "dark_blueprint": ArchitectureDiagram scenes (alternative)
- "mesh":          distributed/network scenes with diagrams
- "solid":         StatCallout, TypewriterText, CodeBlock-heavy scenes

Return ONLY valid JSON. No markdown fences.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    scenes = script.get("scenes", [])
    logger.info("[%s] Designing visual data for %d scenes", AGENT_NAME, len(scenes))

    # Build a compact scene summary for the user message
    scene_lines = []
    for s in scenes:
        panels_summary = ", ".join(
            f"{p.get('area')}={p.get('type')}"
            for p in s.get("panels", [])
        )
        scene_lines.append(
            f"  Scene {s.get('scene_index', '?')}: layout={s.get('layout')!r}  panels=[{panels_summary}]"
        )

    user_message = (
        f"Topic: {director_brief.get('topic')!r}\n\n"
        f"Scenes:\n" + "\n".join(scene_lines) + "\n\n"
        "For each ArchitectureDiagram panel: provide realistic nodes[] and connections[] in panel_visual_data.\n"
        "For each BarChart panel: provide accurate bars[] with real-world values.\n"
        "For each TimelineFlow panel: provide ordered events[].\n"
        "Assign transition and background_variant to every scene.\n"
        "Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.5,
        max_tokens=6000,
        agent_name=AGENT_NAME,
    )

    story: dict = json.loads(extract_json(raw))

    # Normalize: ensure panel_visual_data exists and last scene is "none"
    storyboard_scenes = story.get("scenes", [])
    for scene in storyboard_scenes:
        scene.setdefault("panel_visual_data", {})
        scene.setdefault("transition", "slideLeft")

    if storyboard_scenes:
        storyboard_scenes[-1]["transition"] = "none"

    logger.info("[%s] ✅ Storyboard: %d scenes", AGENT_NAME, len(storyboard_scenes))
    return story
