"""
backend/agents/visual_architect.py — Agent: Visual Architect (expanded Storyboard)

Fills the data for every VISUAL panel — i.e. panels whose component has
dataOwner="visual" in the catalog (diagrams, charts, timelines, stat callouts).
Routing is driven by the catalog tag, NOT a hardcoded type list, so new visual
components are picked up automatically.

Also assigns the per-scene transition.

Output is keyed by (scene index, area) so the Assembler can merge it with the
Scriptwriter's content panels.
"""

import json
import logging

from component_catalog import data_owner, get_schema
from utils.api import chat_completion, parse_json_robust
from .schema import StoryOutput

logger = logging.getLogger(__name__)
AGENT_NAME = "VisualArchitect"

SPATIAL_RULES = """
## SPATIAL RULES for node-based diagrams (ArchitectureDiagram, PacketFlow, FlowDiagram, etc.)

Coordinates are percentages: x = left→right 0-100, y = top→bottom 0-100.
Lay nodes out along the data-flow, left to right, and spread them so no two are within 8 units:

  Client / user      x 5-12     Edge / CDN / LB    x 20-40
  App / service       x 48-62    Cache              x 48-62 (y 65-80)
  DB / queue / store  x 72-85
  Vertical fan-out: use y = 20, 50, 80 for 1-3 parallel nodes.

- 4-7 nodes for a meaningful diagram. Every node appears in ≥1 connection/edge.
- Node type strings must match the component's schema enum exactly.
- Connections: request/query/arrow vs push/replication/stream — pick the right kind.

## DATA RULES for charts (BarChart, LineChart, PieChart, StatCallout)

- Use REAL, defensible numbers (published benchmarks / specs from memory).
- BarChart/LineChart values must span a meaningful range (≥4×), not all within 10%.
- Use real system names as labels (Redis, PostgreSQL, Kafka…), never "Option A".
- Give each bar/slice/series a distinct hex color.

## TimelineFlow / SequenceDiagram / StateMachine / TreeHierarchy

- Real years and real events in strict chronological order (TimelineFlow).
- States/transitions and actors/messages must form a valid, connected diagram.
- TreeHierarchy: a single root with nested children (≤3 levels).
""".strip()

TRANSITION_RULES = """
## TRANSITIONS  (assign one per scene)
"fade" reflective/intro · "slideLeft" forward progression (default) · "slideUp" reveal after a question ·
"zoom" the single most dramatic insight (use once) · "none" ONLY the last scene.
No 3 identical transitions in a row.
""".strip()


def _visual_panels(scenes: list[dict]) -> list[tuple[int, str, str]]:
    """(scene_index, area, type) for every panel whose component is visual-owned."""
    out = []
    for sc in scenes:
        for p in sc.get("panels", []):
            if data_owner(p.get("type", "")) == "visual":
                out.append((sc.get("index"), p.get("area"), p.get("type")))
    return out


def _schema_reference(types: set[str]) -> str:
    """Compact JSON-schema slice for just the visual component types in play."""
    blocks = []
    for t in sorted(types):
        schema = get_schema(t)
        if schema:
            props = schema.get("properties", {})
            required = schema.get("required", [])
            blocks.append(f"### {t}  (required: {', '.join(required) or 'none'})\n{json.dumps(props)[:1200]}")
    return "\n\n".join(blocks)


SYSTEM_PROMPT = f"""
You are a Visual Data Architect for a technical education video. You produce the data that makes
diagrams and charts real and accurate: topologies with real components, charts with real benchmark
numbers, timelines with real history. Every value must be defensible.

Output ONLY a single JSON object — no prose, no markdown fences.

{SPATIAL_RULES}

{TRANSITION_RULES}


You MUST output a "panels" entry for EVERY area listed for each scene — never emit just a title.
Components like TreeHierarchy, StateMachine, SequenceDiagram and FlowDiagram require their full nested
structure (root/children, states/transitions, actors/messages, nodes/edges) — fill ALL required fields,
not only the title. Match each component's schema exactly. Return ONLY valid JSON.
""".strip()


def run_agent(plan: dict, syllabus: dict) -> dict:
    scenes = plan.get("scenes", [])
    visual = _visual_panels(scenes)
    if not visual:
        logger.info("[%s] No visual panels — assigning transitions only", AGENT_NAME)

    types = {t for _, _, t in visual}

    scene_lines = []
    for sc in scenes:
        vpanels = [(p.get("area"), p.get("type")) for p in sc.get("panels", [])
                   if data_owner(p.get("type", "")) == "visual"]
        cov = ", ".join(sc.get("covers", []))
        vis = "; ".join(f"{a}={t}" for a, t in vpanels) or "(none — assign transition only)"
        scene_lines.append(f"  Scene {sc.get('index')} [{sc.get('title')}] covers={cov}\n      visual panels: {vis}")

    user_message = (
        f"Topic: {syllabus.get('topic')}\n\n"
        f"Scenes and their VISUAL panels (fill data only for these areas):\n"
        + "\n".join(scene_lines)
        + "\n\nComponent schemas you must satisfy:\n"
        + (_schema_reference(types) or "(no visual components)")
        + "\n\nProduce accurate data for every visual panel above, and a transition for every scene. "
        "Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.5,
        agent_name=AGENT_NAME,
        response_model=StoryOutput,
    )

    raw_dict: dict = parse_json_robust(raw, label=AGENT_NAME)
    
    # Normalize default transitions before validation to avoid validation errors
    # on missing fields if we want, or rely on Pydantic defaults. Pydantic handles defaults.
    
    story = StoryOutput.model_validate(raw_dict)
    
    # Force last scene transition to "none" after validation
    if story.scenes:
        story.scenes[-1].transition = "none"

    logger.info("[%s] ✅ Visual data for %d panels across %d scenes",
                AGENT_NAME, len(visual), len(story.scenes))
    return story.model_dump()
