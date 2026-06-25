# Component-Aware Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject component catalog + Remotion timing rules into every agent's system prompt, make Director output `scene_types[]`, Scriptwriter generate component-specific data, Storyboard generate visual data, and replace the heavy Assembler LLM call with a pure Python merge + Pydantic validation.

**Architecture:** Tool outputs are fetched once via `build_agent_context()` and injected as static strings into all agent system prompts. Director picks component types. Scriptwriter writes text-field data per component. Storyboard writes visual-field data (nodes, bars, events). Assembler zips and merges — LLM only as fallback on Pydantic failure.

**Tech Stack:** Python 3.12, Pydantic v2, LangGraph, Groq API, existing `utils/api.py` (`chat_completion`), existing `models/video_script.py` (`VideoScript`, `_NullSafeBase`).

## Global Constraints

- All files live under `backend/` — run all commands from `backend/` directory
- Python imports use `from utils.api import chat_completion, extract_json`
- `chat_completion()` signature: `(messages, *, model=GROQ_MODEL, temperature, max_tokens, agent_name) -> str`
- Component type names are EXACT strings from the 13-component catalog — never invent new names
- `VideoScript.model_validate(dict)` validates the final JSON; `_NullSafeBase` coerces `null → []`
- `PipelineState` is a TypedDict in `graph/state.py` — do not change its fields
- Run tests with: `python3 -c "<test code>"` (no pytest installed)

---

### Task 1: Add `build_agent_context()` to tools.py

**Files:**
- Modify: `backend/graph/tools.py`

**Interfaces:**
- Produces: `build_agent_context() -> dict[str, str]` with keys `"compact_catalog"` and `"remotion_timing_rules"`
- Produces: module-level constants `COMPACT_CATALOG: str` and `REMOTION_TIMING_RULES: str`
- Later tasks import: `from graph.tools import build_agent_context`

- [ ] **Step 1: Add the constants and function to tools.py**

Open `backend/graph/tools.py` and add below the existing imports and `@tool` definitions:

```python
# ---------------------------------------------------------------------------
# Agent context — injected into all agent system prompts at pipeline start
# ---------------------------------------------------------------------------

COMPACT_CATALOG = """## AVAILABLE COMPONENTS (13 total — use EXACT type names)

AnimatedTitle
  Use for: intro title cards, section breaks, outro
  data: {title: str, subtitle?: str, align?: "left"|"center"}

BulletList
  Use for: 3-7 key points, takeaways, feature lists
  data: {title: str, items: str[]}

StepFlow
  Use for: sequential steps, ordered process, how-it-works
  data: {title: str, steps: str[]}

ComparisonCard
  Use for: pros vs cons, trade-off analysis, A vs B
  data: {title: str, pros: str[], cons: str[]}

SplitScreen
  Use for: left-panel bullets + optional right-panel code snippet
  data: {title: str, bullets?: str[], codeSnippet?: {code: str, language: str}}

StatCallout
  Use for: single dramatic metric ("99.99% uptime", "10K req/s")
  data: {title: str, value: float, suffix?: str, description?: str}

ArchitectureDiagram
  Use for: system topology — servers, LBs, databases, connections
  data: {title: str, nodes: Node[], connections: Connection[]}
  Node: {id: str, type: "client"|"server"|"loadBalancer"|"database", x: float(0-100), y: float(0-100), label: str}
  Connection: {fromId: str, toId: str, type: "stream"|"arrow"}

TypewriterText
  Use for: dramatic single statement, hook reveal, punchy line
  data: {lines: str[]}

TimelineFlow
  Use for: chronological events, history, evolution of a technology
  data: {title?: str, events: Event[], direction?: "vertical"|"horizontal"}
  Event: {year: str, label: str, description?: str}

QuoteCard
  Use for: quote from a paper, engineer, or design principle
  data: {quote: str, author?: str, role?: str}

CodeBlock
  Use for: code walkthroughs, config examples, pseudocode
  data: {code: str, language?: str, title?: str}

TwoColumnLayout
  Use for: side-by-side comparison with headings and bullet points
  data: {title?: str, left: {heading: str, points: str[]}, right: {heading: str, points: str[]}}

BarChart
  Use for: comparing numeric values — latency, throughput, cost
  data: {title?: str, bars: Bar[], layout?: "vertical"|"horizontal"}
  Bar: {label: str, value: float, color?: str}
"""

REMOTION_TIMING_RULES = """## REMOTION TIMING RULES (fps = 30)

total_frames = duration_seconds × 30

Per-component frame budget (use middle of range by default):
  AnimatedTitle:        120-150 frames  (4-5 s)
  BulletList:           150-240 frames  (5-8 s)
  StepFlow:             150-240 frames  (5-8 s)
  SplitScreen:          180-270 frames  (6-9 s)
  ComparisonCard:       180-270 frames  (6-9 s)
  ArchitectureDiagram:  240-360 frames  (8-12 s)
  StatCallout:           90-150 frames  (3-5 s)
  CodeBlock:            150-270 frames  (5-9 s)
  TypewriterText:        90-180 frames  (3-6 s)
  TimelineFlow:         180-270 frames  (6-9 s)
  QuoteCard:            120-180 frames  (4-6 s)
  TwoColumnLayout:      180-270 frames  (6-9 s)
  BarChart:             150-240 frames  (5-8 s)

Rules:
  - Transition overlay = 15 frames, INCLUDED in scene duration (not additive)
  - sum(all duration_frames) MUST equal total_frames exactly
  - AnimatedTitle intro/outro: use minimum of range (120 frames)
"""


def build_agent_context() -> dict[str, str]:
    """
    Returns injectable context strings for all agent system prompts.
    Deterministic — no LLM call, no I/O. Safe to call multiple times.
    """
    return {
        "compact_catalog": COMPACT_CATALOG,
        "remotion_timing_rules": REMOTION_TIMING_RULES,
    }
```

- [ ] **Step 2: Verify the function works**

```bash
python3 -c "
from graph.tools import build_agent_context, COMPACT_CATALOG, REMOTION_TIMING_RULES
ctx = build_agent_context()
assert 'compact_catalog' in ctx
assert 'remotion_timing_rules' in ctx
assert 'ArchitectureDiagram' in ctx['compact_catalog']
assert 'total_frames' in ctx['remotion_timing_rules']
print('✅ build_agent_context() OK, catalog chars:', len(ctx['compact_catalog']))
"
```

Expected: `✅ build_agent_context() OK, catalog chars: <number>`

- [ ] **Step 3: Commit**

```bash
git add backend/graph/tools.py
git commit -m "feat: add build_agent_context() with compact catalog + timing rules"
```

---

### Task 2: Director — output scene_types[]

**Files:**
- Modify: `backend/agents/director.py`

**Interfaces:**
- Consumes: `build_agent_context()` from `graph.tools`
- Produces: `run_agent(topic: str) -> dict` with new field `scene_types: list[str]` alongside existing `scene_titles: list[str]`
- Contract: `len(scene_types) == len(scene_titles) == scene_count`

- [ ] **Step 1: Replace director.py entirely**

```python
"""
backend/agents/director.py — Agent 1: Director

New: outputs scene_types[] (one component name per scene) alongside scene_titles[].
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
  1. scene_types[0]  → always "AnimatedTitle"
  2. scene_types[-1] → always "AnimatedTitle"
  3. At least 40% of scenes must be TEXT-BASED:
     BulletList | StepFlow | SplitScreen | ComparisonCard | CodeBlock | TwoColumnLayout | TypewriterText | QuoteCard
  4. No more than 2 consecutive "ArchitectureDiagram" entries
  5. Use at least 3 DIFFERENT component types across all scenes

### Diagram-driven non-comparison (5-7 scenes):
  scene_types[0]  → "AnimatedTitle"
  scene_types[-1] → "AnimatedTitle"
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
        logger.warning("[%s] scene_types length %d != scene_titles length %d — fixing", AGENT_NAME, len(types), len(titles))
        # Pad or trim to match
        while len(types) < len(titles):
            types.append("BulletList")
        brief["scene_types"] = types[:len(titles)]

    logger.info("[%s] ✅ Brief: %d scenes, types=%s", AGENT_NAME, brief.get("scene_count"), brief.get("scene_types"))
    return brief
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
python3 -c "
import agents.director as d
print('SYSTEM_PROMPT length:', len(d.SYSTEM_PROMPT))
assert 'ArchitectureDiagram' in d.SYSTEM_PROMPT
assert 'scene_types' in d.SYSTEM_PROMPT
print('✅ director.py OK')
"
```

Expected: `✅ director.py OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/director.py
git commit -m "feat(director): output scene_types[] with component diversity rules"
```

---

### Task 3: Scriptwriter — component-aware data generation

**Files:**
- Modify: `backend/agents/scriptwriter.py`

**Interfaces:**
- Consumes: `director_brief` dict with `scene_types: list[str]`
- Produces: `run_agent(director_brief: dict) -> dict` where each scene has:
  - `scene_index: int`
  - `component_type: str` (copied from `scene_types[i]`)
  - `narration: str`
  - `data: dict` (text fields specific to the component type)

- [ ] **Step 1: Replace scriptwriter.py entirely**

```python
"""
backend/agents/scriptwriter.py — Agent 2: Scriptwriter

Component-aware: reads scene_types[] from the director brief and generates
narration + component-specific data fields per scene.

Text-heavy components (BulletList, StepFlow, SplitScreen, etc.) get their
full data from this agent.  Visual components (ArchitectureDiagram, BarChart,
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
data: {{"title": "<section heading>", "items": ["<point 1>", "<point 2>", "<point 3>", ...]}}
  - 3 to 7 items, each ≤ 12 words
  - No full sentences — concise phrases

### StepFlow
data: {{"title": "<process name>", "steps": ["<step 1>", "<step 2>", "<step 3>", ...]}}
  - 3 to 6 steps, each ≤ 10 words
  - Start with a verb: "Hash the key", "Route to node", "Replicate to followers"

### ComparisonCard
data: {{"title": "<what is being compared>", "pros": ["<advantage>", ...], "cons": ["<disadvantage>", ...]}}
  - 3 to 5 items per side, each ≤ 10 words

### SplitScreen
data: {{"title": "<heading>", "bullets": ["<point>", "<point>", "<point>"], "codeSnippet": {{"code": "<code string with \\n>", "language": "<lang>"}} or null}}
  - 2 to 5 bullets
  - Include codeSnippet only if there is genuine code to show; otherwise null

### StatCallout
data: {{"title": "<what the stat measures>", "value": <float>, "suffix": "<unit e.g. ms, req/s, %>", "description": "<one line explanation>"}}

### TypewriterText
data: {{"lines": ["<dramatic line 1>", "<dramatic line 2>"]}}
  - 1 to 3 short punchy lines, each ≤ 8 words

### QuoteCard
data: {{"quote": "<the quote text>", "author": "<name or null>", "role": "<title or null>"}}

### CodeBlock
data: {{"title": "<what the code shows>", "code": "<code with \\n for newlines>", "language": "<python|go|yaml|etc>"}}

### TwoColumnLayout
data: {{"title": "<optional heading>", "left": {{"heading": "<left col name>", "points": ["<point>", ...]}}, "right": {{"heading": "<right col name>", "points": ["<point>", ...]}}}}
  - 3 to 5 points per column

### BarChart
data: {{"title": "<chart title>", "bars": [{{"label": "<name>", "value": <float>}}]}}
  - 3 to 6 bars with realistic comparative values

### ArchitectureDiagram
data: {{"title": "<diagram title>"}}
  ← ONLY the title. Nodes and connections will be added by the Storyboard agent.

### TimelineFlow
data: {{"title": "<optional timeline title>"}}
  ← ONLY the title. Events will be added by the Storyboard agent.

## NARRATION RULES
- 3-5 complete technical sentences per scene
- Explain the WHY before the HOW
- Reference real systems (Kafka, Cassandra, Redis, Kubernetes, etcd) when relevant
- Progressive complexity — each scene builds on the previous

## CRITICAL
- scenes array length MUST equal the number of scene_types in the director brief
- component_type in each scene MUST exactly match the director's scene_types[i]
- data fields must match the schema for that component type exactly
- Use null (not empty string) for optional missing fields
- Return ONLY valid JSON
""".strip()


def run_agent(director_brief: dict) -> dict:
    topic = director_brief.get("topic", "")
    scene_types = director_brief.get("scene_types", [])
    scene_titles = director_brief.get("scene_titles", [])

    logger.info("[%s] Writing component-aware script: %d scenes, types=%s", AGENT_NAME, len(scene_types), scene_types)

    # Build a compact scene plan for the user message
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
        # Ensure data dict exists
        if "data" not in scene or not isinstance(scene.get("data"), dict):
            scene["data"] = {}
        # Ensure title in data
        if "title" not in scene["data"] and i < len(scene_titles):
            scene["data"]["title"] = scene_titles[i]

    logger.info("[%s] ✅ Script: %d scenes", AGENT_NAME, len(script.get("scenes", [])))
    return script
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
python3 -c "
import agents.scriptwriter as s
print('SYSTEM_PROMPT length:', len(s.SYSTEM_PROMPT))
assert 'component_type' in s.SYSTEM_PROMPT
assert 'ArchitectureDiagram' in s.SYSTEM_PROMPT
assert 'BulletList' in s.SYSTEM_PROMPT
print('✅ scriptwriter.py OK')
"
```

Expected: `✅ scriptwriter.py OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/scriptwriter.py
git commit -m "feat(scriptwriter): generate component-specific data fields per scene"
```

---

### Task 4: Storyboard — visual data + transitions

**Files:**
- Modify: `backend/agents/storyboard.py`

**Interfaces:**
- Consumes: `director_brief` dict, `script` dict (with `scenes[].component_type`)
- Produces: `run_agent(director_brief, script) -> dict` where each scene has:
  - `scene_index: int`
  - `component_type: str`
  - `transition: str` (one of: `"fade"` | `"slideLeft"` | `"slideUp"` | `"zoom"` | `"none"`)
  - `background_variant: str`
  - `visual_data: dict` (nodes/connections for ArchitectureDiagram, bars for BarChart, events for TimelineFlow; `{}` for all others)

- [ ] **Step 1: Replace storyboard.py entirely**

```python
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
  - x, y: float 0-100 (percentage of 1920×1080 canvas). Spread nodes across the canvas.
  - label: short display name (≤ 20 chars)
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
visual_data: {{}}   ← empty dict, no visual data needed

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

    # Build compact scene list for user message
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
        "For ALL others: visual_data must be {{}}.\n"
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
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
python3 -c "
import agents.storyboard as s
print('SYSTEM_PROMPT length:', len(s.SYSTEM_PROMPT))
assert 'visual_data' in s.SYSTEM_PROMPT
assert 'nodes' in s.SYSTEM_PROMPT
assert 'BarChart' in s.SYSTEM_PROMPT
print('✅ storyboard.py OK')
"
```

Expected: `✅ storyboard.py OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/storyboard.py
git commit -m "feat(storyboard): output visual_data for diagram/chart components and transitions"
```

---

### Task 5: Sync — component-aware timing

**Files:**
- Modify: `backend/agents/sync.py`

**Interfaces:**
- Consumes: `director_brief` dict, `script` dict (with `scenes[].component_type`)
- Produces: same shape as before — `{fps, total_frames, scenes[{scene_index, start_frame, duration_frames}]}`

- [ ] **Step 1: Replace sync.py entirely**

```python
"""
backend/agents/sync.py — Agent 4: Sync Specialist

Component-aware: uses component_type from the script to assign frame budgets.
"""

import json
import logging

from graph.tools import build_agent_context
from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)
AGENT_NAME = "SyncSpecialist"

_CTX = build_agent_context()

SYSTEM_PROMPT = f"""
You are a video timing specialist. Compute Remotion frame timings for a technical video.

{_CTX["remotion_timing_rules"]}

## OUTPUT SCHEMA (return ONLY this JSON, no markdown):
{{
  "fps": 30,
  "total_frames": <int>,
  "scenes": [
    {{
      "scene_index": <int>,
      "component_type": "<ExactComponentName>",
      "start_frame": <int>,
      "duration_frames": <int>
    }}
  ]
}}

## TIMING ALGORITHM
1. total_frames = total_seconds × 30
2. Assign each scene a base budget from the per-component table above (use midpoint of range)
3. Scale all budgets proportionally so they sum to total_frames exactly
4. Minimum duration_frames for any scene: 90

## ADJUSTMENT RULES
- AnimatedTitle (intro, index=0): use minimum (120 frames)
- AnimatedTitle (outro, last scene): use minimum (120 frames)
- ArchitectureDiagram: use upper half of range (300-360 frames)
- SplitScreen with code: add 30 extra frames
- start_frame[0] = 0
- start_frame[i] = sum of all previous duration_frames
- sum(all duration_frames) MUST equal total_frames exactly
  → adjust the last scene's duration_frames to absorb any rounding difference

Return ONLY valid JSON. No markdown.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    total_seconds = director_brief.get("total_seconds", 60)
    logger.info("[%s] Computing timings: %ds @ 30fps", AGENT_NAME, total_seconds)

    scene_lines = "\n".join(
        f"  Scene {s.get('scene_index', i)}: component_type={s.get('component_type')!r}"
        for i, s in enumerate(script.get("scenes", []))
    )

    user_message = (
        f"total_seconds: {total_seconds}\n"
        f"total_frames: {total_seconds * 30}\n\n"
        f"Scenes:\n{scene_lines}\n\n"
        "Compute duration_frames for each scene using the per-component frame budget table. "
        "Ensure sum(duration_frames) == total_frames exactly. Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
        max_tokens=3000,
        agent_name=AGENT_NAME,
    )

    timing: dict = json.loads(extract_json(raw))

    # Hard fix: ensure frame sum matches
    expected = total_seconds * 30
    timing["total_frames"] = expected
    timing["fps"] = 30
    scenes = timing.get("scenes", [])
    if scenes:
        actual = sum(s.get("duration_frames", 0) for s in scenes)
        if actual != expected:
            diff = expected - actual
            scenes[-1]["duration_frames"] = max(90, scenes[-1]["duration_frames"] + diff)
        # Recompute start_frames
        cursor = 0
        for s in scenes:
            s["start_frame"] = cursor
            cursor += s.get("duration_frames", 0)
        # Backfill component_type from script
        script_scenes = script.get("scenes", [])
        for i, s in enumerate(scenes):
            if i < len(script_scenes):
                s["component_type"] = script_scenes[i].get("component_type", s.get("component_type", "BulletList"))

    logger.info("[%s] ✅ Timing: %d frames, %d scenes", AGENT_NAME, expected, len(scenes))
    return timing
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
python3 -c "
import agents.sync as s
assert 'component_type' in s.SYSTEM_PROMPT
assert 'ArchitectureDiagram' in s.SYSTEM_PROMPT
print('✅ sync.py OK')
"
```

Expected: `✅ sync.py OK`

- [ ] **Step 3: Commit**

```bash
git add backend/agents/sync.py
git commit -m "feat(sync): component-aware frame budget allocation"
```

---

### Task 6: Assembler — Python merge + Pydantic validation

**Files:**
- Modify: `backend/graph/nodes.py`

**Interfaces:**
- Consumes: `state["script"]` (has `scenes[].component_type` and `scenes[].data`)
- Consumes: `state["story"]` (has `scenes[].visual_data` and `scenes[].transition`)
- Consumes: `state["timing"]` (has `scenes[].duration_frames`)
- Consumes: `state["brief"]` (has `palette`, `typography`, `total_seconds`)
- Produces: `state["video_script"]` — a dict passing `VideoScript.model_validate()`

- [ ] **Step 1: Replace the `assembler_node` function in nodes.py**

Replace the entire `assembler_node` function (keep all other node functions unchanged):

```python
def assembler_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running assembler node")
    brief   = state["brief"]
    script  = state["script"]
    story   = state.get("story") or {}
    timing  = state["timing"]
    topic   = state["topic"]

    palette = brief.get("palette", {})
    typo    = brief.get("typography", {})

    # Index storyboard and timing by scene_index for O(1) lookup
    story_by_idx  = {s.get("scene_index", i): s for i, s in enumerate(story.get("scenes", []))}
    timing_by_idx = {s.get("scene_index", i): s for i, s in enumerate(timing.get("scenes", []))}

    script_scenes = script.get("scenes", [])
    scenes_out = []

    for i, s_script in enumerate(script_scenes):
        idx       = s_script.get("scene_index", i)
        s_story   = story_by_idx.get(idx, story_by_idx.get(i, {}))
        s_timing  = timing_by_idx.get(idx, timing_by_idx.get(i, {}))

        component_type = s_script.get("component_type", "BulletList")

        # Merge: Scriptwriter text fields + Storyboard visual fields
        text_data   = dict(s_script.get("data") or {})
        visual_data = dict(s_story.get("visual_data") or {})
        merged_data = {**text_data, **visual_data}

        # Ensure title present as fallback
        if "title" not in merged_data:
            merged_data["title"] = s_script.get("title", f"Scene {i + 1}")

        # Transition: storyboard decides; last scene always "none"
        transition = s_story.get("transition", "fade")
        if i == len(script_scenes) - 1:
            transition = "none"

        scenes_out.append({
            "id": f"scene-{i + 1}",
            "type": component_type,
            "duration_frames": s_timing.get("duration_frames", 150),
            "transition": transition,
            "data": merged_data,
        })

    # Fix frame sum
    total_frames = brief.get("total_seconds", 60) * 30
    actual_total = sum(s["duration_frames"] for s in scenes_out)
    if actual_total != total_frames and scenes_out:
        diff = total_frames - actual_total
        scenes_out[-1]["duration_frames"] = max(90, scenes_out[-1]["duration_frames"] + diff)
        logger.info("[assembler] Frame sum corrected by %d frames on last scene", diff)

    raw_script = {
        "title": brief.get("topic", topic),
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "theme": {
            "primary":    palette.get("primary",    "#7c3aed"),
            "secondary":  palette.get("secondary",  "#f59e0b"),
            "accent":     palette.get("highlight",  palette.get("accent", "#34d399")),
            "background": palette.get("background", "#0b0f1e"),
            "font":       typo.get("heading_font",  "Inter"),
        },
        "scenes": scenes_out,
    }

    from models.video_script import VideoScript
    from pydantic import ValidationError

    try:
        vs = VideoScript.model_validate(raw_script)
        validated = vs.model_dump(mode="json")
        logger.info(
            "[assembler] ✅ Merge OK — %d scenes, %d total frames",
            len(vs.scenes), vs.total_frames(),
        )
        return {"video_script": validated, "model_used": "merge", "fallback_triggered": False}
    except ValidationError as exc:
        logger.warning("[assembler] ⚠️ Pydantic failed (%d errors) — LLM fix pass", len(exc.errors()))
        return _assembler_llm_fix(raw_script, exc, brief, topic)
    except Exception as exc:
        logger.error("[assembler] ❌ Unexpected error: %s", exc)
        return {"errors": [str(exc)]}


def _assembler_llm_fix(raw_script: dict, exc, brief: dict, topic: str) -> dict[str, Any]:
    """Minimal LLM call to fix only Pydantic validation errors. Called only on failure."""
    from utils.api import get_client, extract_json as _extract_json
    from models.video_script import VideoScript
    from pydantic import ValidationError

    errors_summary = "; ".join(
        f"scene[{e.get('loc')}]: {e.get('msg')}"
        for e in exc.errors()[:5]
    )

    fix_prompt = (
        f"Fix this VideoScript JSON to pass Pydantic validation.\n"
        f"Validation errors: {errors_summary}\n\n"
        f"Current JSON:\n{json.dumps(raw_script, indent=2)[:6000]}\n\n"
        "Return ONLY the corrected JSON. No markdown. No prose."
    )

    system = (
        "You are a JSON fixer. Return only valid JSON matching the VideoScript schema. "
        "Fix only the reported errors. Do not change scene count or content."
    )

    from utils.api import chat_completion as _cc
    try:
        raw = _cc(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": fix_prompt},
            ],
            temperature=0.1,
            max_tokens=8192,
            agent_name="AssemblerFix",
        )
        fixed = json.loads(extract_json(raw))
        vs = VideoScript.model_validate(fixed)
        logger.info("[assembler-fix] ✅ LLM fix passed")
        return {"video_script": vs.model_dump(mode="json"), "model_used": "llm-fix", "fallback_triggered": True}
    except Exception as e:
        logger.error("[assembler-fix] ❌ LLM fix also failed: %s", e)
        return {"video_script": raw_script, "model_used": "raw", "fallback_triggered": True, "errors": [str(e)]}
```

Also remove the now-unused imports at the top of `assembler_node` (the old `get_component_catalog`, `get_remotion_skill` calls inside the function body). The `extract_json` import stays at the file top.

- [ ] **Step 2: Verify nodes.py imports cleanly**

```bash
python3 -c "
import graph.nodes as n
print('director_node:', n.director_node)
print('assembler_node:', n.assembler_node)
print('_assembler_llm_fix:', n._assembler_llm_fix)
print('✅ nodes.py OK')
"
```

Expected: `✅ nodes.py OK`

- [ ] **Step 3: Verify server still starts**

```bash
python3 -c "import server; print('✅ server.py imports OK')"
```

Expected: `✅ server.py imports OK`

- [ ] **Step 4: Commit**

```bash
git add backend/graph/nodes.py
git commit -m "feat(assembler): replace heavy LLM call with Python merge + Pydantic validation"
```

---

### Task 7: End-to-End Smoke Test

**Files:** No new files — verify the full pipeline produces valid JSON.

- [ ] **Step 1: Run the pipeline directly (no HTTP server needed)**

```bash
python3 -c "
import time
from graph.pipeline import compiled_graph
from graph.state import PipelineState

initial_state: PipelineState = {
    'topic': 'Horizontal vs Vertical Scaling',
    'duration_seconds': 60,
    'brief': None, 'script': None, 'story': None,
    'timing': None, 'video_script': None,
    'errors': [], 'model_used': None, 'fallback_triggered': False,
}

print('Running pipeline...')
t0 = time.monotonic()
result = compiled_graph.invoke(initial_state)
elapsed = time.monotonic() - t0

vs = result.get('video_script')
errors = result.get('errors', [])

if errors:
    print('❌ Errors:', errors)
else:
    scenes = vs.get('scenes', [])
    types = [s['type'] for s in scenes]
    unique_types = set(types)
    text_types = {'BulletList','StepFlow','SplitScreen','ComparisonCard','AnimatedTitle',
                  'TypewriterText','QuoteCard','CodeBlock','TwoColumnLayout','StatCallout'}
    text_scene_count = sum(1 for t in types if t in text_types)
    total = sum(s['duration_frames'] for s in scenes)

    print(f'✅ Pipeline OK in {elapsed:.1f}s')
    print(f'   Scenes: {len(scenes)}')
    print(f'   Types:  {types}')
    print(f'   Unique: {unique_types}')
    print(f'   Text scenes: {text_scene_count}/{len(scenes)} ({100*text_scene_count//len(scenes)}%)')
    print(f'   Total frames: {total} (expected {60*30})')
    assert total == 60 * 30, f'Frame sum mismatch: {total} != {60*30}'
    assert len(unique_types) >= 3, f'Not enough variety: {unique_types}'
    print('   All assertions passed ✅')
"
```

Expected:
```
✅ Pipeline OK in <N>s
   Scenes: 6
   Types:  ['AnimatedTitle', 'SplitScreen', 'ArchitectureDiagram', ...]
   Unique: {'AnimatedTitle', 'SplitScreen', 'ArchitectureDiagram', ...}
   Text scenes: 4/6 (66%)
   Total frames: 1800 (expected 1800)
   All assertions passed ✅
```

- [ ] **Step 2: Register output in frontend and open studio**

```bash
# From frontend/ directory:
npm run register-examples
```

Open http://localhost:3000 and verify the new composition appears without TypeError.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test: e2e pipeline smoke test passes — component-aware JSON generation"
```
