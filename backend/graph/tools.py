import json
import logging
from functools import lru_cache
from langchain_core.tools import tool
from component_catalog import get_catalog

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Agent context — injected into all agent system prompts at pipeline start
# ---------------------------------------------------------------------------

COMPACT_CATALOG = """## LAYOUT SYSTEM — each scene uses exactly one layout

LAYOUT NAME          AREAS (exact strings)                    DIMENSIONS
─────────────────────────────────────────────────────────────────────────────────
"full"               panel                                    1920×1080 (no header)
"left-right"         left · right                             960×1080 each (no header)
"title-content"      main                                     1920×920 (header auto-rendered)
"title-left-right"   left · right                             960×920 each (header auto-rendered)
"title-main-sidebar" main · sidebar                           main=1248×920 · sidebar=672×920 (header auto-rendered)

HEADER: auto-rendered from scene.title + scene.subtitle for any title-* layout.
RULE: panels[].area values MUST exactly match the area strings above for the chosen layout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## COMPONENTS — 28 available (use EXACT type names)

Type               Best areas          Data shape (required fields bold)
─────────────────────────────────────────────────────────────────────────────────
AnimatedTitle      panel               {**title**, subtitle?, align?:"left"|"center"}
                   ONLY in "full" layout.

BulletList         left·right·sidebar  {**title**, **items**:str[5-7]}
                   Staggered reveal. Items must be specific — include numbers and system names.

StepFlow           left·main           {**title**, **steps**:str[4-6]}
                   Steps start with action verbs. Horizontal animated flow.

ComparisonCard     main·left           {**title**, **pros**:str[4-5], **cons**:str[4-5]}
                   Side-by-side. Items must be real trade-offs, not marketing language.

ArchitectureDiagram right·main         {**title**, nodes:Node[], connections:Connection[]}
                   Node: {id, type:"client"|"server"|"loadBalancer"|"database", x:0-100, y:0-100, label}
                   Connection: {fromId, toId, type:"stream"|"arrow"}
                   nodes[] must have 4-7 entries. Spread spatially — no two nodes at same position.
                   Storyboard fills nodes[] and connections[]; Scriptwriter only outputs title.

BarChart           right·sidebar       {title?, **bars**:[{label, value, color?}][4-6]}
                   Values must be real-world benchmarks. Span at least 4× range. Label with real system names.
                   Storyboard fills bars[]; Scriptwriter fills title only.

TimelineFlow       main·panel          {title?, events:[{year, label, description}][4-6]}
                   Strict chronological order. Real events, real years.
                   Storyboard fills events[]; Scriptwriter fills title only.

CodeBlock          right·main·sidebar  {**code**:str, language?:str, title?:str}
                   10-18 lines of real, production-quality code. Escape newlines as \\n.

StatCallout        sidebar·right       {**title**, **value**:float, suffix?:str, description?:str}
                   Large animated number. Use a real surprising metric. One number per panel.

TypewriterText     panel               {**lines**:str[2-3]}
                   Billboard copy. Max 8 words per line.

QuoteCard          panel·main          {**quote**:str, author?:str, role?:str}
                   Verbatim real quotes only. Do not fabricate.

SplitScreen        main                {**title**, bullets?:str[4-6], codeSnippet?:{code, language}}
                   Hybrid: text + code together.

TwoColumnLayout    panel·main          {title?, **left**:{heading,points:str[4-5]}, **right**:{heading,points:str[4-5]}}
                   Parallel structure — both columns answer the same questions about different subjects.

PacketFlow         main·panel          {title?, **nodes**:[{id,label,x,y,type?,sublabel?}], **edges**:[{from,to,label?,color?}]}
                   Animated SVG network: glowing nodes + data packets traveling along edges.
                   node.type: "client"|"server"|"database"|"router"|"cdn" (controls color and symbol).
                   x, y: 0-100 percent coordinates. Use same spatial zones as ArchitectureDiagram.
                   edges: packets animate repeatedly from→to. Add label for protocol name (e.g. "TCP SYN").
                   Scriptwriter fills all fields (no storyboard delegation needed).

HttpExchange       main·panel          {title?, method?, **path**, host?, requestHeaders?, requestBody?, statusCode?, statusText?, responseHeaders?, responseBody?}
                   Side-by-side HTTP request + response with line-by-line animated reveal.
                   method: "GET"|"POST"|"PUT"|"DELETE"|"PATCH" (default GET).
                   requestHeaders/responseHeaders: {key: value} objects (real HTTP headers).
                   responseBody: JSON or text string (escape newlines as \\n).
                   Best for: API explanations, REST deep-dives, protocol scenes.

HashRing           panel·main          {title?, **servers**:str[2-6], virtualNodesPerServer?:int, lookupKeys?:str[], ticks?:int}
                   Consistent hashing ring with virtual nodes + animated key lookups.
                   Use for: distributed caches (Memcached, DynamoDB), sharding, CDN routing.
                   Each server gets a color automatically. lookupKeys sweep clockwise.

StateMachine       panel·main          {title?, **states**:[{id,label,color?,description?}], **transitions**:[{fromId,toId,label,highlight?}], activeStateId?:str}
                   States laid out in a circle. Self-loops supported.
                   highlight: bool on transition → glowing color (latest/active).
                   Use for: protocol diagrams (Raft, TCP handshake), cache coherence, FSMs.

TreeHierarchy      panel·main          {title?, **root**:{label,description?,color?,**children**:[{label,description?,color?,**children**:[{label,description?,color?}]}]}}
                   Auto-laid-out top-down tree. Up to 3 levels of nesting.
                   Use for: B-trees, DNS hierarchy, recursion trees, file systems, org charts.

SequenceDiagram    panel·main          {title?, **actors**:str[2-6], **messages**:[{fromIdx:int,toIdx:int,label,kind?:"sync"|"return"|"async",active?:bool}], activations?:[{actorIdx,startMessage,endMessage,label?}]}
                   UML-style sequence diagram. Lifelines drawn dashed.
                   Use for: API request flows, microservice communication, auth sequences.

LineChart          main·right          {title?, **xLabels**:str[], **series**:[{name,color?,values:number[],fill?:bool}], yLabel?:str, xLabel?:str, highlightIndex?:int}
                   Multi-series animated line chart. Lines draw in over time.
                   highlightIndex draws a vertical guide + emphasized point.
                   Use for: growth curves, latency vs load, time-series comparisons.

MathFormula        panel·main          {title?, **tokens**:[{type,value?,numerator?,denominator?,base?,exponent?,subscript?,body?,lower?,upper?,color?}], description?:str}
                   Single centered formula. Token types: text|var|num|op|frac|sup|sub|sqrt|sum|space.
                   Use for: Big-O notation, key equations, formula callouts.

EquationDerivation panel·main          {title?, **steps**:[{label?,tokens,highlight?:bool,final?:bool,note?}]}
                   Vertical stack of formulas connected by ↓ arrows. Final step rendered larger.
                   Use for: proof walks, algebraic transformations, multi-step derivations.

TerminalCLI        panel·main          {title?, **command**:str, **output**:str[], typingCommand?:bool, outputLineDelay?:int, typingSpeed?:number, caption?:str, theme?:"dark"|"matrix"|"amber", highlightLines?:int[]}
                   Animated terminal — types the command then streams output line by line.
                   highlightLines: 1-indexed line numbers that get a colored bar.
                   Use for: tutorials, debugging flows, command demonstrations.

PieChart           panel·main          {title?, **slices**:[{label,value,color?}], centerLabel?:str, centerValue?:str, variant?:"pie"|"donut", highlightIndex?:int}
                   Animated pie/donut with sweeping reveal. Side legend with percentages.
                   highlightIndex: slice "explodes" outward.
                   Use for: proportional breakdowns, market share, traffic split.

NumberedList       panel·main          {title?, **items**:[{heading,description?,color?,icon?}][3-6], layout?:"stack"|"grid"}
                   Big numbered badge cards. Stack (vertical) or grid (2-column).
                   Use for: ranked principles, ordered steps, top-N lists.

GlossaryCards      panel·main          {title?, **terms**:[{term,definition,icon?,color?}][4-9], grid?:"auto"|"2x2"|"2x3"|"3x2"|"3x3"}
                   Grid of term/definition cards with colored icon tiles.
                   Use for: vocabulary, acronym glossaries, concept maps.

FlowDiagram        panel·main          {title?, **nodes**:[{id,label,kind?:"process"|"decision"|"start"|"end",description?,color?}], **edges**:[{fromId,toId,label?,active?:bool}]}
                   Branching flow with auto-layered layout. Decision = diamond, start/end = pill.
                   Use for: workflows with branching, conditional logic, algorithms with if/else.

CalloutAnnotation  panel·main          {title?, **body**:str, bullets?:str[], position?:"left"|"right"|"top"|"bottom"}
                   Highlighted callout box with corner brackets + side arrow.
                   Use for: key insights, definitions, "the key takeaway" beats.
─────────────────────────────────────────────────────────────────────────────────
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
  PacketFlow:           180-300 frames  (6-10 s)
  HttpExchange:         180-300 frames  (6-10 s)
  HashRing:             240-360 frames  (8-12 s)
  StateMachine:         180-300 frames  (6-10 s)
  TreeHierarchy:        180-300 frames  (6-10 s)
  SequenceDiagram:      180-300 frames  (6-10 s)
  LineChart:            180-300 frames  (6-10 s)
  MathFormula:          120-240 frames  (4-8 s)
  EquationDerivation:   240-420 frames  (8-14 s, longer for many steps)
  TerminalCLI:          180-360 frames  (6-12 s)
  PieChart:             150-240 frames  (5-8 s)
  NumberedList:         180-300 frames  (6-10 s)
  GlossaryCards:        180-300 frames  (6-10 s)
  FlowDiagram:          240-360 frames  (8-12 s)
  CalloutAnnotation:    120-240 frames  (4-8 s)

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
