"""
backend/agents/scriptwriter.py — Agent 2: Scriptwriter

Generates dense, technically rich content for every panel in every scene.
Each scene is a multi-panel layout — the scriptwriter fills data for each panel.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Scriptwriter"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Principal Engineer writing dense, technically rich content for a multi-panel technical education video.

{_CTX["compact_catalog"]}

## YOUR JOB
For each scene you receive: layout, panel_plan (area + component type per panel), title, subtitle.
Write the narration AND complete data for every panel.

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "scenes": [
    {{
      "scene_index": <int>,
      "layout": "<layout name>",
      "title": "<scene title — used as header text>",
      "subtitle": "<1 sentence — shown under header>",
      "narration": "<3-5 deeply technical spoken sentences>",
      "panels": [
        {{
          "area": "<area name>",
          "type": "<ExactComponentName>",
          "data": {{ ... component-specific fields ... }}
        }}
      ]
    }}
  ]
}}

## DATA RULES PER COMPONENT TYPE

### AnimatedTitle  (use in "full" layout, area="panel")
data: {{"title": "<compelling title>", "subtitle": "<punchy tagline>"}}

### BulletList
data: {{"title": "<heading>", "items": ["<point>", ...]}}
  - 5-7 items, each ≤12 words, specific and technical
  - Include exact numbers, system names, trade-offs

### StepFlow
data: {{"title": "<process name>", "steps": ["<Step>", ...]}}
  - 4-6 steps, start with a verb: "Hash the key", "Acquire the lease"
  - Each step ≤10 words

### ComparisonCard
data: {{"title": "<what is compared>", "pros": ["<pro>", ...], "cons": ["<con>", ...]}}
  - 4-5 items per side, each ≤10 words with real technical trade-offs

### ArchitectureDiagram
data: {{"title": "<diagram title>"}}
  Nodes and connections come from Storyboard. Only output the title here.

### BarChart
data: {{"title": "<chart title>", "bars": [{{"label": "<name>", "value": <float>}}]}}
  - 4-6 bars with REALISTIC, accurate values (e.g. latency in ms, throughput in req/s)
  - Include the unit in the title (e.g. "Read Latency (ms)")

### TimelineFlow
data: {{"title": "<timeline title>"}}
  Events come from Storyboard. Only output the title here.

### CodeBlock
data: {{"title": "<what it shows>", "code": "<real code with \\n>", "language": "<python|go|yaml|bash|sql>"}}
  - 8-15 lines of REAL, production-quality code or config
  - Annotate with comments showing what each part does

### StatCallout
data: {{"title": "<metric name>", "value": <real float>, "suffix": "<unit>", "description": "<1 sentence context>"}}
  - Use a real-world number that makes the point dramatically (e.g. 99.99, 6, 10000, 0.03)

### TypewriterText
data: {{"lines": ["<line 1>", "<line 2>"]}}
  - 2-3 short, punchy, evocative lines (≤8 words each)

### QuoteCard
data: {{"quote": "<impactful real quote>", "author": "<name>", "role": "<title or paper>"}}

### SplitScreen
data: {{"title": "<heading>", "bullets": ["<point>", ...], "codeSnippet": {{"code": "...", "language": "..."}} }}
  - 4-6 bullets + real code snippet (8-12 lines)

### TwoColumnLayout
data: {{"title": "<heading>", "left": {{"heading": "<col A>", "points": ["<point>", ...]}}, "right": {{"heading": "<col B>", "points": ["<point>", ...]}} }}
  - 4-5 points per column, technically precise

## NARRATION RULES
- 3-5 complete spoken sentences
- Explain WHY first, then HOW — motivation-first teaching
- Reference real systems (Kafka, Cassandra, Redis, Kubernetes, etcd, DynamoDB, Spanner, Zookeeper)
- Include exact trade-offs, failure modes, or performance numbers in at least 1 sentence
- Build progressive complexity — each scene assumes the viewer understood the previous

## CRITICAL
- panels array must have exactly the same panels (area + type) as the director's scene_panel_plans[i]
- data must match the schema for each component type exactly
- For ArchitectureDiagram and TimelineFlow: only output title in data (visual data comes from Storyboard)
- NEVER output empty items[], steps[], pros[], cons[], bars[], or lines[]
- Return ONLY valid JSON
""".strip()


def run_agent(director_brief: dict) -> dict:
    topic = director_brief.get("topic", "")
    scene_titles = director_brief.get("scene_titles", [])
    scene_subtitles = director_brief.get("scene_subtitles", [])
    scene_layouts = director_brief.get("scene_layouts", [])
    scene_panel_plans = director_brief.get("scene_panel_plans", [])

    logger.info("[%s] Writing %d multi-panel scenes for %r", AGENT_NAME, len(scene_titles), topic)

    scene_plan_text = "\n".join(
        f"  Scene {i}: layout={layout!r}  title={title!r}  subtitle={sub!r}\n"
        f"    panels: {json.dumps(panels)}"
        for i, (title, sub, layout, panels) in enumerate(
            zip(scene_titles, scene_subtitles, scene_layouts, scene_panel_plans)
        )
    )

    user_message = (
        f"Topic: {topic!r}\n"
        f"arc_type: {director_brief.get('arc_type')!r}\n"
        f"total_seconds: {director_brief.get('total_seconds')}\n\n"
        f"Scene plans:\n{scene_plan_text}\n\n"
        "Write deeply technical narration + panel data for each scene. "
        "For ArchitectureDiagram and TimelineFlow panels, output only the title in data. "
        "Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=10000,
        agent_name=AGENT_NAME,
    )

    script: dict = json.loads(extract_json(raw))

    # Backfill layout/title/subtitle from director if LLM omitted them
    for i, scene in enumerate(script.get("scenes", [])):
        if i < len(scene_layouts):
            scene.setdefault("layout", scene_layouts[i])
        if i < len(scene_titles):
            scene.setdefault("title", scene_titles[i])
        if i < len(scene_subtitles):
            scene.setdefault("subtitle", scene_subtitles[i])
        # Backfill panel areas/types from director plan
        if i < len(scene_panel_plans):
            plan = scene_panel_plans[i]
            panels = scene.get("panels", [])
            plan_areas = {p["area"]: p["type"] for p in plan}
            panel_areas = {p.get("area"): p for p in panels}
            merged = []
            for p_plan in plan:
                area = p_plan["area"]
                ctype = p_plan["type"]
                existing = panel_areas.get(area, {})
                merged.append({
                    "area": area,
                    "type": ctype,
                    "data": existing.get("data", {"title": scene.get("title", "")}),
                })
            scene["panels"] = merged

    logger.info("[%s] ✅ Script: %d scenes", AGENT_NAME, len(script.get("scenes", [])))
    return script
