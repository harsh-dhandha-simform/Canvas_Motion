"""
backend/agents/storyboard.py — Agent 4: Storyboard Designer

Responsibilities:
  - Design the visual layout for every scene with a system design focus.
  - Describe complex SVG graphic elements: network diagrams, ring topologies,
    hash tables, timelines, state machines, node grids, data flow arrows.
  - Produce a storyboard JSON that the Code-Generator uses to write
    custom inline SVG / React components.

Output contract (JSON object):
  {
    "scenes": [
      {
        "scene_index":        int,
        "layout":             str,
        "background_variant": str,
        "visual_concept":     str,     // the central visual metaphor for this scene
        "elements": [
          {
            "type":        str,
            "label":       str,
            "description": str,        // detailed SVG/diagram description
            "position":    str,
            "animation":   str,
            "z_layer":     int         // stacking order (1=background, 5=foreground)
          }
        ],
        "transitions": {
          "enter": str,               // how this scene enters
          "exit":  str                // how this scene exits
        }
      }
    ]
  }
"""

import json
import logging

from utils.api import chat_completion, extract_json

logger = logging.getLogger(__name__)

AGENT_NAME = "Storyboard"

SYSTEM_PROMPT = """
You are a Principal Visualization Engineer and storyboard artist specializing in
technical system design diagrams for 1920x1080 educational videos.

You receive a Director's Brief and a Script, and must design rich, technically
accurate visual layouts for every scene that illustrate complex distributed systems
and architecture concepts.

Output ONLY a JSON storyboard (no markdown, no prose) with this exact structure:

{
  "scenes": [
    {
      "scene_index":        <int>,
      "layout":             "<layout description, e.g. 'left-panel-text-right-panel-diagram'>",
      "background_variant": "<gradient|solid|particle_field|grid|mesh|dark_blueprint>",
      "visual_concept":     "<the central visual idea, e.g. 'consistent hash ring with virtual nodes'>",
      "elements": [
        {
          "type":        "<text_block|svg_diagram|node_network|hash_ring|timeline|state_machine|code_block|counter|progress_bar|arrow_flow|bar_chart|data_table>",
          "label":       "<snake_case identifier>",
          "description": "<exhaustively detailed SVG/layout description for accurate code generation>",
          "position":    "<top-left|top-center|top-right|left|center|right|bottom-left|bottom-center|bottom-right|full-width>",
          "animation":   "<fade-in|slide-up|slide-right|slide-left|scale-in|draw-path|count-up|pulse|highlight-sequence|typewriter>",
          "z_layer":     <1-5>
        }
      ],
      "transitions": {
        "enter": "<fade|slide-up|wipe-right|zoom-in>",
        "exit":  "<fade|slide-left|wipe-left|zoom-out>"
      }
    }
  ]
}

=== SYSTEM DESIGN DIAGRAM VOCABULARY ===

For "svg_diagram" elements, use EXHAUSTIVELY detailed descriptions that include:
  - Network diagrams: "A ring of 8 server nodes (circles, 48px radius) connected by
    curved arrows, arranged in a clockwise circle on a dark background. Labels show
    server IDs. Highlighted node pulsing in primary color shows the current master."
  - Hash rings: "Circular SVG path (radius 280px) with 256 tick marks. 4 server nodes
    placed at 12, 3, 6, 9 o'clock positions as filled circles. 8 virtual nodes shown
    as smaller triangles. A key lookup arrow sweeps clockwise to the nearest node."
  - State machines: "3 rectangular state boxes connected by curved labeled arrows.
    States: LEADER (green), FOLLOWER (blue), CANDIDATE (yellow). Transitions labeled
    with conditions (e.g. 'heartbeat timeout', 'vote granted')."
  - Data flow: "Left side shows 3 producer boxes. Center shows a partitioned topic
    bar (5 partitions). Right shows 3 consumer group boxes. Animated arrows flow
    from producers through partitions to consumers."
  - Timeline: "Horizontal timeline bar with 5 labeled events. Each event is a circle
    on the bar that scales in with spring animation as narration progresses."

=== LAYOUT RULES ===
1. scenes array length must exactly match the script's scene count.
2. Each scene must have 3–7 elements for richness.
3. Title/heading text block is always required in every scene.
4. Technical diagrams must be the dominant visual element (large, center-right).
5. Text overlay (narration bullets) always goes on the left or bottom panel.
6. Use z_layer to properly stack overlapping elements.
7. Vary transitions between scenes (do not repeat the same enter/exit pair).
8. Use "code_block" element type when the scene has a code snippet.
9. Background variant should match content:
   - "particle_field" for abstract/distributed concepts
   - "grid" or "dark_blueprint" for architecture/diagram-heavy scenes
   - "gradient" for intro/hook/conclusion scenes
   - "mesh" for network topology scenes
10. "highlight-sequence" animation: elements reveal one-by-one as narration progresses.

Return ONLY valid JSON.
""".strip()


def run_agent(director_brief: dict, script: dict) -> dict:
    """
    Run the Storyboard agent.

    Args:
        director_brief: Parsed output from the Director agent.
        script:         Parsed output from the Scriptwriter agent.

    Returns:
        Storyboard dict with per-scene visual element descriptions.
    """
    logger.info("[%s] Designing storyboard for %d scenes", AGENT_NAME, director_brief.get("scene_count"))

    user_message = (
        f"Director's Brief:\n{json.dumps(director_brief, indent=2)}\n\n"
        f"Script:\n{json.dumps(script, indent=2)}\n\n"
        "Design technically accurate, visually rich storyboard for each scene. "
        "For system design topics, use complex visual metaphors: hash rings, network node "
        "graphs, state machines, data flow diagrams, timelines, and partitioned structures. "
        "Be exhaustively detailed in SVG descriptions so the Code Generator can produce "
        "accurate inline SVG diagrams."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.6,
        max_tokens=12000,
        agent_name=AGENT_NAME,
    )

    cleaned = extract_json(raw)

    try:
        storyboard: dict = json.loads(cleaned)
        scene_count = len(storyboard.get("scenes", []))
        logger.info("[%s] ✅ Storyboard complete: %d scenes", AGENT_NAME, scene_count)
        return storyboard
    except json.JSONDecodeError as exc:
        logger.error("[%s] ❌ Failed to parse JSON: %s\nRaw:\n%s", AGENT_NAME, exc, raw)
        raise ValueError(f"Storyboard agent returned invalid JSON: {exc}") from exc
