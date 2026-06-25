import json
import logging
from functools import lru_cache
from langchain_core.tools import tool
from component_catalog import get_catalog

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Agent context — injected into all agent system prompts at pipeline start
# ---------------------------------------------------------------------------

COMPACT_CATALOG = """## LAYOUT SYSTEM — every scene uses one of these 5 layouts

  "full"               One panel, area="panel". Full 1920×1080. Use for intro/outro AnimatedTitle.
  "left-right"         Two panels: area="left" (960×1080) + area="right" (960×1080). No header.
  "title-content"      Header bar (auto) + one panel area="main" (1920×920). Deep explanation.
  "title-left-right"   Header bar + area="left" (960×920) + area="right" (960×920). Most common.
  "title-main-sidebar" Header bar + area="main" (1248×920, wide) + area="sidebar" (672×920, narrow).

  Header bar is rendered automatically from scene.title + scene.subtitle.
  Panels only fill the non-header areas listed above.
  RULE: panels[].area must exactly match the area names for the chosen layout.

## AVAILABLE COMPONENTS (13 total — use EXACT type names)

AnimatedTitle    → Full-screen dramatic title. ONLY use in "full" layout, area="panel".
  data: {title: str, subtitle?: str, align?: "left"|"center"}

BulletList       → 3-7 concise bullets with staggered reveal.
  data: {title: str, items: str[]}
  GREAT in: "left", "right", "sidebar"

StepFlow         → Animated horizontal step-by-step flow.
  data: {title: str, steps: str[]}  (3-6 steps)
  GREAT in: "left", "main"

ComparisonCard   → Side-by-side pros vs cons.
  data: {title: str, pros: str[], cons: str[]}  (3-5 items each)
  GREAT in: "main", "panel" (full), "left"

ArchitectureDiagram → System topology with nodes and connections.
  data: {title: str, nodes: Node[], connections: Connection[]}
  Node: {id, type: "client"|"server"|"loadBalancer"|"database", x: 0-100, y: 0-100, label}
  Connection: {fromId, toId, type: "stream"|"arrow"}
  RULE: nodes[] must have ≥3 entries. NEVER leave nodes[] empty.
  GREAT in: "right", "main"

BarChart         → Animated bar chart comparing numeric values.
  data: {title?: str, bars: [{label, value, color?}]}  (3-6 bars)
  GREAT in: "right", "sidebar"

TimelineFlow     → Chronological events with staggered reveal.
  data: {title?: str, events: [{year, label, description?}]}  (3-6 events)
  GREAT in: "main", "panel" (full)

CodeBlock        → macOS-style code window with syntax highlighting.
  data: {code: str, language?: str, title?: str}
  GREAT in: "right", "main", "sidebar"

StatCallout      → Large animated metric number.
  data: {title: str, value: float, suffix?: str, description?: str}
  GREAT in: "sidebar", "right"

TypewriterText   → Character-by-character text reveal.
  data: {lines: str[]}  (1-3 short lines)
  GREAT in: "panel" (full) for dramatic openers

QuoteCard        → Pull quote with author attribution.
  data: {quote: str, author?: str, role?: str}
  GREAT in: "panel" (full), "main"

SplitScreen      → Bullets + optional code snippet combined.
  data: {title: str, bullets?: str[], codeSnippet?: {code: str, language: str}}
  GREAT in: "main"

TwoColumnLayout  → Two-column comparison with headings.
  data: {title?: str, left: {heading: str, points: str[]}, right: {heading: str, points: str[]}}
  GREAT in: "panel" (full), "main"
"""

REMOTION_TIMING_RULES = """## REMOTION TIMING RULES (fps = 30)

total_frames = duration_seconds x 30

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


@tool
def get_component_catalog() -> str:
    """
    Returns the JSON-serializable component catalog containing descriptions and schemas
    for all available frontend components. Use this to understand what UI components
    can be used in the video script.
    """
    catalog = get_catalog()
    return json.dumps(catalog, indent=2)


@tool
@lru_cache(maxsize=1)
def get_remotion_skill(topic: str) -> str:
    """
    Returns advice and best practices for creating Remotion videos.
    Useful when you need specific syntax or timing tricks for React/Remotion.
    """
    from config import REPO_ROOT
    
    skill_path = REPO_ROOT / ".agents" / "skills" / "remotion-best-practices" / "SKILL.md"
    try:
        if skill_path.exists():
            return skill_path.read_text(encoding="utf-8")
        else:
            logger.warning(f"Skill file not found at {skill_path}")
            return "Remotion best practices: Always use interpolate, Easing, and useCurrentFrame. Ensure deterministic animations."
    except Exception as e:
        logger.error(f"Error reading Remotion skill file: {e}")
        return "Remotion best practices: Always use interpolate, Easing, and useCurrentFrame. Ensure deterministic animations."


tools = [get_component_catalog, get_remotion_skill]
