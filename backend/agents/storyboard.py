"""
backend/agents/storyboard.py — Agent 3: Storyboard

Provides:
  - transition + background_variant per scene
  - visual_data (nodes/bars/events) for diagram/chart panels, keyed by panel area
"""

import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, parse_json_robust

logger = logging.getLogger(__name__)
AGENT_NAME = "Storyboard"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a Visual Data Architect for a technical education video. Your job is to produce the visual
data that makes abstract systems tangible: architecture diagrams that show real topology, charts with
real-world numbers, timelines with real history. Every output must be defensible and accurate.

{_CTX["compact_catalog"]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT SCHEMA (return ONLY this JSON, no markdown)

{{
  "scenes": [
    {{
      "scene_index": <int>,
      "transition": "<fade|slideLeft|slideUp|zoom|none>",
      "background_variant": "<gradient|grid|dark_blueprint|mesh|solid>",
      "panel_visual_data": {{
        "<area>": {{ ... visual data ... }}
      }}
    }}
  ]
}}

Only ArchitectureDiagram, BarChart, and TimelineFlow panels need entries in panel_visual_data.
All other panel types (BulletList, CodeBlock, etc.) must NOT appear in panel_visual_data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ARCHITECTURE DIAGRAM DATA

panel_visual_data["<area>"] for an ArchitectureDiagram must contain:
{{
  "nodes": [...],
  "connections": [...]
}}

### Node placement rules

Use this spatial layout grid (x = left→right, y = top→bottom, both 0-100%):

  ZONE          x range    y positions
  ─────────────────────────────────────────────────────
  Client        5-12       50 (single) · 30,70 (two)
  Edge/CDN      20-28      50
  Gateway/LB    30-40      50
  App servers   48-62      20,50,80 (1-3 nodes spread)
  Cache         48-62      use 65-80 if below app servers
  DB primary    72-83      30-50
  DB replica    72-83      60-75 (if shown separately)
  Queue/stream  72-83      70-85
  ─────────────────────────────────────────────────────

Rules:
  - nodes[]: 4-7 entries (never fewer than 4 for a meaningful diagram)
  - id: short, lowercase, no spaces (lb, api1, cache, db_primary)
  - type: EXACTLY one of "client" | "server" | "loadBalancer" | "database"
    Use "loadBalancer" for CDN, API gateway, nginx, HAProxy
    Use "database" for PostgreSQL, Redis, Kafka, S3, queue
    Use "server" for app server, microservice, worker, cache (Redis as a service)
    Use "client" for browser, mobile app, CLI, external user
  - x, y: spread nodes so NO two nodes share the same (x, y) within 8 units
  - Every node must appear in at least one connection

### Connection rules
  - "arrow":  request/response, pull, query, API call (has direction)
  - "stream": push, replication, pub/sub, continuous flow (data streams out)
  - fromId → toId = direction of data or request flow
  - Add connections for all major data paths — don't leave isolated nodes

### Example: 5-node microservice diagram
nodes:
  {{"id":"client",  "type":"client",       "x":8,  "y":50, "label":"Browser"}}
  {{"id":"gateway", "type":"loadBalancer", "x":28, "y":50, "label":"API Gateway"}}
  {{"id":"api",     "type":"server",       "x":52, "y":30, "label":"Order Service"}}
  {{"id":"worker",  "type":"server",       "x":52, "y":70, "label":"Payment Worker"}}
  {{"id":"db",      "type":"database",     "x":78, "y":30, "label":"PostgreSQL"}}
  {{"id":"queue",   "type":"database",     "x":78, "y":70, "label":"RabbitMQ"}}
connections:
  {{"fromId":"client",  "toId":"gateway", "type":"arrow"}}
  {{"fromId":"gateway", "toId":"api",     "type":"arrow"}}
  {{"fromId":"api",     "toId":"db",      "type":"stream"}}
  {{"fromId":"api",     "toId":"queue",   "type":"stream"}}
  {{"fromId":"queue",   "toId":"worker",  "type":"arrow"}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## BAR CHART DATA

panel_visual_data["<area>"] for a BarChart must contain:
{{
  "bars": [
    {{"label": "<system>", "value": <real number>, "color": "<hex>"}},
    ...
  ]
}}

Rules:
  - 4-6 bars with REAL benchmark values (memory of published benchmarks is acceptable).
  - Values must span at least 4× range (e.g. 1ms to 12ms — not 9ms to 12ms).
  - Colors: use 4-6 distinct hex colours from the theme family; no two bars the same colour.
  - ✅ Read latency: Redis=0.4, Memcached=0.6, DynamoDB=5, PostgreSQL=9, Cassandra=14 (all in ms)
  - ✅ Throughput req/s: nginx=50000, express=12000, flask=3000, django=2500
  - ❌ All values within 10% of each other (no visual story)
  - ❌ "Option A", "System 1" labels (use real system names)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TIMELINE FLOW DATA

panel_visual_data["<area>"] for a TimelineFlow must contain:
{{
  "events": [
    {{"year": "<year or quarter>", "label": "<event name>", "description": "<1 informative sentence>"}},
    ...
  ]
}}

Rules:
  - 4-6 events in strict chronological order.
  - Use real years and real events. These must be accurate.
  - description: explain the significance, not just restate the label.
    ✅ {{"year":"2007","label":"Amazon Dynamo paper","description":"Introduced consistent hashing and vector clocks to the industry, inspiring Cassandra, Riak, and Voldemort."}}
    ❌ {{"year":"2007","label":"Amazon Dynamo","description":"Amazon released Dynamo."}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TRANSITIONS

"fade"      → scene 0 (intro), outro, any reflective/summary scene
"slideLeft" → default forward progression — scenes that move through a concept
"slideUp"   → reveal after a question or challenge — before the answer lands
"zoom"      → use EXACTLY ONCE for the video's most dramatic insight
"none"      → ONLY the last scene in the video

Constraint: no 3 consecutive identical transitions (vary the rhythm).

## BACKGROUND VARIANTS

"gradient"       → intro/outro AnimatedTitle, QuoteCard, TypewriterText
"grid"           → ArchitectureDiagram scenes (looks like graph paper — fits system topology)
"dark_blueprint" → ArchitectureDiagram scenes (alt, darker feel — use for security/infra topics)
"mesh"           → distributed systems, networking, Kafka, Kubernetes scenes with diagrams
"solid"          → CodeBlock-heavy, StatCallout, or BulletList-only scenes

Return ONLY valid JSON. No markdown fences, no commentary.
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
        agent_name=AGENT_NAME,
    )

    story: dict = parse_json_robust(raw, label=AGENT_NAME)

    # Normalize: ensure panel_visual_data exists and last scene is "none"
    storyboard_scenes = story.get("scenes", [])
    for scene in storyboard_scenes:
        scene.setdefault("panel_visual_data", {})
        scene.setdefault("transition", "slideLeft")

    if storyboard_scenes:
        storyboard_scenes[-1]["transition"] = "none"

    logger.info("[%s] ✅ Storyboard: %d scenes", AGENT_NAME, len(storyboard_scenes))
    return story
