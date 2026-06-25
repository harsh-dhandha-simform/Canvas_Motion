import json
import logging
from functools import lru_cache
from langchain_core.tools import tool
from component_catalog import get_catalog

logger = logging.getLogger(__name__)

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
