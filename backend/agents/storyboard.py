"""
backend/agents/storyboard.py — Agent 3: Storyboard

Produces visual data for diagram/chart components and assigns transitions.
Text-heavy components get visual_data={} — their data comes from Scriptwriter.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Storyboard"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Visual Data Designer for technical education videos.
Your job: generate structured visual data for diagram/chart components
and assign transitions for every scene.

{_CTX["compact_catalog"]}

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "scenes": [
    {{
      "scene_index": <int>,
      "component_type": "<ExactComponentName>",
      "transition": "<fade|slideLeft|slideUp|zoom|none>",
      "background_variant": "<gradient|grid|dark_blueprint|mesh|solid>",
      "visual_data": {{ ... see rules below ... }}
    }}
  ]
}}

## VISUAL DATA RULES PER COMPONENT

### ArchitectureDiagram — REQUIRED non-empty nodes and connections
visual_data: {{
  "nodes": [
    {{"id": "client", "type": "client", "x": 10, "y": 50, "label": "Client"}},
    {{"id": "lb", "type": "loadBalancer", "x": 35, "y": 50, "label": "Load Balancer"}},
    {{"id": "server1", "type": "server", "x": 60, "y": 30, "label": "Server A"}},
    {{"id": "server2", "type": "server", "x": 60, "y": 70, "label": "Server B"}},
    {{"id": "db", "type": "database", "x": 85, "y": 50, "label": "PostgreSQL"}}
  ],
  "connections": [
    {{"fromId": "client", "toId": "lb", "type": "arrow"}},
    {{"fromId": "lb", "toId": "server1", "type": "arrow"}},
    {{"fromId": "lb", "toId": "server2", "type": "arrow"}},
    {{"fromId": "server1", "toId": "db", "type": "stream"}},
    {{"fromId": "server2", "toId": "db", "type": "stream"}}
  ]
}}
Node rules:
  - id: short unique string (no spaces)
  - type: exactly "client" | "server" | "loadBalancer" | "database"
  - x, y: float 0-100 (percentage of 1920x1080 canvas). Spread nodes across the canvas.
  - label: short display name (20 chars max)
  - At least 3 nodes, at most 8 nodes
Connection rules:
  - fromId and toId must match existing node ids
  - type: "arrow" for request/response flow, "stream" for continuous data

### BarChart
visual_data: {{
  "bars": [
    {{"label": "Option A", "value": 45.0, "color": "#7c3aed"}},
    {{"label": "Option B", "value": 120.0, "color": "#f59e0b"}}
  ]
}}
  - 3 to 6 bars with REALISTIC numeric values for the technical concept
  - Use meaningful units (milliseconds, requests/sec, GB, etc.)

### TimelineFlow
visual_data: {{
  "events": [
    {{"year": "2006", "label": "Amazon S3 launches", "description": "Object storage at scale"}},
    {{"year": "2010", "label": "Cassandra open-sourced", "description": "Wide-column NoSQL"}}
  ]
}}
  - 3 to 6 events, ordered chronologically
  - year: string (can be "2006", "Q3 2010", "Early 2015")

### ALL OTHER COMPONENTS (AnimatedTitle, BulletList, StepFlow, etc.)
visual_data: {{}}   <- empty dict, no visual data needed

## TRANSITION SELECTION RULES
- "fade": calm reveal — intro (scene 0), reflective, conclusion scenes
- "slideLeft": forward motion — between sequential content scenes
- "slideUp": upward energy — after a comparison or before a reveal
- "zoom": emphasis — use at most ONCE per video for the key insight scene
- "none": ONLY for the very last scene (index = total_scenes - 1)
- Do NOT repeat the same transition for 3+ consecutive scenes

## BACKGROUND VARIANT RULES
- "gradient": AnimatedTitle, QuoteCard, intro/outro
- "grid": ArchitectureDiagram, CodeBlock (technical/blueprint feel)
- "dark_blueprint": ArchitectureDiagram (alternative)
- "mesh": network-heavy diagrams, distributed system scenes
- "solid": StatCallout, TypewriterText (minimal, clean)

Return ONLY valid JSON. No markdown fences, no prose.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    scene_count = len(script.get("scenes", []))
    logger.info("[%s] Designing visual data for %d scenes", AGENT_NAME, scene_count)

    scene_lines = "\n".join(
        f"  Scene {s.get('scene_index', i)+1}: component_type={s.get('component_type')!r}  title={s.get('data', {}).get('title', s.get('title', ''))!r}"
        for i, s in enumerate(script.get("scenes", []))
    )

    user_message = (
        f"Topic: {director_brief.get('topic')!r}  arc_type: {director_brief.get('arc_type')!r}\n\n"
        f"Scenes (you must produce visual_data for each):\n{scene_lines}\n\n"
        "For ArchitectureDiagram scenes: nodes[] and connections[] are REQUIRED and must be non-empty.\n"
        "For BarChart: bars[] with realistic values.\n"
        "For TimelineFlow: events[] with chronological entries.\n"
        "For ALL others: visual_data must be {}.\n"
        "Assign a transition and background_variant to every scene.\n"
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

    # Backfill component_type and ensure visual_data exists
    script_scenes = script.get("scenes", [])
    for i, scene in enumerate(story.get("scenes", [])):
        if i < len(script_scenes):
            scene["component_type"] = script_scenes[i].get("component_type", scene.get("component_type", "BulletList"))
        if "visual_data" not in scene or not isinstance(scene.get("visual_data"), dict):
            scene["visual_data"] = {}
        if "transition" not in scene:
            scene["transition"] = "fade"

    # Force last scene transition to "none"
    scenes = story.get("scenes", [])
    if scenes:
        scenes[-1]["transition"] = "none"

    logger.info("[%s] ✅ Storyboard: %d scenes", AGENT_NAME, len(scenes))
    return story
