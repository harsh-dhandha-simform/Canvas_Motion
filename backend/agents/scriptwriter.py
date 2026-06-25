"""
backend/agents/scriptwriter.py — Agent 2: Scriptwriter

Component-aware: reads scene_types[] from the director brief and generates
narration + component-specific data fields per scene.

Text-heavy components (BulletList, StepFlow, SplitScreen, etc.) get their
full data from this agent. Visual components (ArchitectureDiagram, BarChart,
TimelineFlow) get only a title here — their nodes/bars/events come from Storyboard.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "Scriptwriter"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Principal Engineer writing a component-aware script for a technical education video.

{_CTX["compact_catalog"]}

## YOUR JOB
For each scene, you receive the component type chosen by the Director.
Write narration AND the component's data fields.

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "scenes": [
    {{
      "scene_index": <int>,
      "component_type": "<ExactComponentName>",
      "narration": "<3-5 spoken sentences, deeply technical>",
      "data": {{ ... component-specific fields, see rules below ... }}
    }}
  ]
}}

## DATA FIELD RULES PER COMPONENT TYPE

### AnimatedTitle
data: {{"title": "<punchy title>", "subtitle": "<one compelling line or null>"}}

### BulletList
data: {{"title": "<section heading>", "items": ["<point 1>", "<point 2>", "<point 3>"]}}
  - 3 to 7 items, each at most 12 words
  - No full sentences — concise phrases

### StepFlow
data: {{"title": "<process name>", "steps": ["<step 1>", "<step 2>", "<step 3>"]}}
  - 3 to 6 steps, each at most 10 words
  - Start with a verb: "Hash the key", "Route to node", "Replicate to followers"

### ComparisonCard
data: {{"title": "<what is being compared>", "pros": ["<advantage>"], "cons": ["<disadvantage>"]}}
  - 3 to 5 items per side, each at most 10 words

### SplitScreen
data: {{"title": "<heading>", "bullets": ["<point>", "<point>", "<point>"], "codeSnippet": {{"code": "<code>", "language": "<lang>"}} }}
  - 2 to 5 bullets
  - Include codeSnippet only if there is genuine code to show; otherwise omit it

### StatCallout
data: {{"title": "<what the stat measures>", "value": <float>, "suffix": "<unit e.g. ms, req/s, %>", "description": "<one line explanation>"}}

### TypewriterText
data: {{"lines": ["<dramatic line 1>", "<dramatic line 2>"]}}
  - 1 to 3 short punchy lines, each at most 8 words

### QuoteCard
data: {{"quote": "<the quote text>", "author": "<name or null>", "role": "<title or null>"}}

### CodeBlock
data: {{"title": "<what the code shows>", "code": "<code with \\n for newlines>", "language": "<python|go|yaml|etc>"}}

### TwoColumnLayout
data: {{"title": "<optional heading>", "left": {{"heading": "<left col name>", "points": ["<point>"]}}, "right": {{"heading": "<right col name>", "points": ["<point>"]}} }}
  - 3 to 5 points per column

### BarChart
data: {{"title": "<chart title>", "bars": [{{"label": "<name>", "value": <float>}}]}}
  - 3 to 6 bars with realistic comparative values

### ArchitectureDiagram
data: {{"title": "<diagram title>"}}
  <- ONLY the title. Nodes and connections will be added by the Storyboard agent.

### TimelineFlow
data: {{"title": "<optional timeline title>"}}
  <- ONLY the title. Events will be added by the Storyboard agent.

## NARRATION RULES
- 3-5 complete technical sentences per scene
- Explain the WHY before the HOW
- Reference real systems (Kafka, Cassandra, Redis, Kubernetes, etcd) when relevant
- Progressive complexity — each scene builds on the previous

## CRITICAL
- scenes array length MUST equal the number of scene_types in the director brief
- component_type in each scene MUST exactly match the director's scene_types[i]
- data fields must match the schema for that component type exactly
- Return ONLY valid JSON
""".strip()


def run_agent(director_brief: dict) -> dict:
    topic = director_brief.get("topic", "")
    scene_types = director_brief.get("scene_types", [])
    scene_titles = director_brief.get("scene_titles", [])

    logger.info(
        "[%s] Writing component-aware script: %d scenes, types=%s",
        AGENT_NAME, len(scene_types), scene_types,
    )

    scene_plan = "\n".join(
        f"  Scene {i+1}: title={title!r}  component_type={ctype!r}"
        for i, (title, ctype) in enumerate(zip(scene_titles, scene_types))
    )

    user_message = (
        f"Topic: {topic!r}\n"
        f"arc_type: {director_brief.get('arc_type')!r}\n"
        f"total_seconds: {director_brief.get('total_seconds')}\n\n"
        f"Scene plan (you MUST follow these component types exactly):\n{scene_plan}\n\n"
        "Write narration + component data for each scene. "
        "Return only JSON matching the output schema."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=8192,
        agent_name=AGENT_NAME,
    )

    script: dict = json.loads(extract_json(raw))

    # Backfill component_type from director if LLM forgot or got it wrong
    for i, scene in enumerate(script.get("scenes", [])):
        if i < len(scene_types):
            scene["component_type"] = scene_types[i]
        if "data" not in scene or not isinstance(scene.get("data"), dict):
            scene["data"] = {}
        if "title" not in scene["data"] and i < len(scene_titles):
            scene["data"]["title"] = scene_titles[i]

    logger.info("[%s] ✅ Script: %d scenes", AGENT_NAME, len(script.get("scenes", [])))
    return script
