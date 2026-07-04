/**
 * src/registry.ts
 *
 * Maps scene type names (as produced by the backend JSON) to the actual
 * imported React components. 
 * 
 * Checklist for adding a new component:
 * 1. Build the component in `src/components/` and export its React component and Zod schema.
 * 2. Import it here and add it to `COMPONENT_REGISTRY` and `COMPONENT_SCHEMAS`.
 * 3. Add its `ComponentMeta` to `COMPONENT_META` (used by backend Planner agents).
 * 4. Add its `description` and `schema` to `COMPONENT_CATALOG` (used by backend Assembler agent).
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { AnimatedTitle, AnimatedTitleSchema } from "./components/AnimatedTitle";
import { ComparisonCard, ComparisonCardSchema } from "./components/ComparisonCard";
import { BulletList, BulletListSchema } from "./components/BulletList";
import { StepFlow, StepFlowSchema } from "./components/StepFlow";
import { StatCallout, StatCalloutSchema } from "./components/StatCallout";
import { ArchitectureDiagram, ArchitectureDiagramSchema } from "./components/ArchitectureDiagram";
import { SplitScreen, SplitScreenSchema } from "./components/SplitScreen";
import { TypewriterText, TypewriterTextSchema } from "./components/TypewriterText";
import { TimelineFlow, TimelineFlowSchema } from "./components/TimelineFlow";
import { QuoteCard, QuoteCardSchema } from "./components/QuoteCard";
import { CodeBlock, CodeBlockSchema } from "./components/CodeBlock";
import { TwoColumnLayout, TwoColumnLayoutSchema } from "./components/TwoColumnLayout";
import { BarChart, BarChartSchema } from "./components/BarChart";
import { PacketFlow, PacketFlowSchema } from "./components/PacketFlow";
import { HttpExchange, HttpExchangeSchema } from "./components/HttpExchange";
import { HashRing, HashRingSchema } from "./components/HashRing";
import { StateMachine, StateMachineSchema } from "./components/StateMachine";
import { TreeHierarchy, TreeHierarchySchema } from "./components/TreeHierarchy";
import { SequenceDiagram, SequenceDiagramSchema } from "./components/SequenceDiagram";
import { LineChart, LineChartSchema } from "./components/LineChart";
import { MathFormula, MathFormulaSchema } from "./components/MathFormula";
import { EquationDerivation, EquationDerivationSchema } from "./components/EquationDerivation";
import { TerminalCLI, TerminalCLISchema } from "./components/TerminalCLI";
import { PieChart, PieChartSchema } from "./components/PieChart";
import { NumberedList, NumberedListSchema } from "./components/NumberedList";
import { GlossaryCards, GlossaryCardsSchema } from "./components/GlossaryCards";
import { FlowDiagram, FlowDiagramSchema } from "./components/FlowDiagram";
import { CalloutAnnotation, CalloutAnnotationSchema } from "./components/CalloutAnnotation";

export const COMPONENT_REGISTRY = {
  AnimatedTitle,
  ComparisonCard,
  BulletList,
  StepFlow,
  StatCallout,
  ArchitectureDiagram,
  SplitScreen,
  TypewriterText,
  TimelineFlow,
  QuoteCard,
  CodeBlock,
  TwoColumnLayout,
  BarChart,
  PacketFlow,
  HttpExchange,
  HashRing,
  StateMachine,
  TreeHierarchy,
  SequenceDiagram,
  LineChart,
  MathFormula,
  EquationDerivation,
  TerminalCLI,
  PieChart,
  NumberedList,
  GlossaryCards,
  FlowDiagram,
  CalloutAnnotation,
} as const;

export const COMPONENT_SCHEMAS = {
  AnimatedTitle: AnimatedTitleSchema,
  ComparisonCard: ComparisonCardSchema,
  BulletList: BulletListSchema,
  StepFlow: StepFlowSchema,
  StatCallout: StatCalloutSchema,
  ArchitectureDiagram: ArchitectureDiagramSchema,
  SplitScreen: SplitScreenSchema,
  TypewriterText: TypewriterTextSchema,
  TimelineFlow: TimelineFlowSchema,
  QuoteCard: QuoteCardSchema,
  CodeBlock: CodeBlockSchema,
  TwoColumnLayout: TwoColumnLayoutSchema,
  BarChart: BarChartSchema,
  PacketFlow: PacketFlowSchema,
  HttpExchange: HttpExchangeSchema,
  HashRing: HashRingSchema,
  StateMachine: StateMachineSchema,
  TreeHierarchy: TreeHierarchySchema,
  SequenceDiagram: SequenceDiagramSchema,
  LineChart: LineChartSchema,
  MathFormula: MathFormulaSchema,
  EquationDerivation: EquationDerivationSchema,
  TerminalCLI: TerminalCLISchema,
  PieChart: PieChartSchema,
  NumberedList: NumberedListSchema,
  GlossaryCards: GlossaryCardsSchema,
  FlowDiagram: FlowDiagramSchema,
  CalloutAnnotation: CalloutAnnotationSchema,
} as const;

// Zod v4 ships a native JSON-Schema converter. The old `zod-to-json-schema`
// package targets zod v3 and silently emits empty schemas against v4 — which is
// what left the backend Validator with nothing to validate against.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJsonSchema = (schema: any, name?: string) => zodToJsonSchema(schema, name);

/**
 * Picker metadata — the knowledge the planning agents (Shortlister, Director,
 * Timing) need that the Zod schema can't express:
 *   category   : coarse grouping for shortlisting
 *   dataOwner  : which agent fills `data` — "content" (Scriptwriter) | "visual" (Visual Architect)
 *   bestAreas  : grid areas this component looks good in
 *   useWhen    : one-line cue the Director uses to choose it
 *   tags       : lexical/affinity terms the Shortlister scores against
 *   minSeconds : minimum on-screen time for the animation to read (Timing floor)
 *
 * This is the ONLY place to declare a component's planning metadata. Adding a
 * component = add its entry here + the two lines above. Everything downstream
 * (catalog JSON, backend registry, shortlist, validation) is generated.
 */
export type ComponentMeta = {
  category:
    | "text"
    | "list"
    | "code"
    | "chart"
    | "network-diagram"
    | "state-tree"
    | "sequence"
    | "math"
    | "timeline"
    | "title"
    | "algorithm";
  dataOwner: "content" | "visual";
  bestAreas: string[];
  useWhen: string;
  tags: string[];
  minSeconds: number;
};

export const COMPONENT_META: Record<SceneType, ComponentMeta> = {
  AnimatedTitle: { category: "title", dataOwner: "content", bestAreas: ["panel"], useWhen: "scene 0 hook or final outro — a dramatic title with stakes", tags: ["title", "intro", "outro", "hook"], minSeconds: 4 },
  TypewriterText: { category: "title", dataOwner: "content", bestAreas: ["panel"], useWhen: "billboard-style dramatic 2-3 line statement", tags: ["dramatic", "statement", "reveal", "billboard"], minSeconds: 4 },
  QuoteCard: { category: "text", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a real verbatim quote from a paper, talk, or engineer", tags: ["quote", "authority", "citation"], minSeconds: 5 },
  CalloutAnnotation: { category: "text", dataOwner: "content", bestAreas: ["panel", "main", "sidebar"], useWhen: "emphasize a key insight or definition in prose", tags: ["insight", "definition", "takeaway", "explanation", "note"], minSeconds: 5 },
  BulletList: { category: "list", dataOwner: "content", bestAreas: ["left", "right", "sidebar"], useWhen: "5-7 specific claims, each with a number or system name", tags: ["list", "points", "facts", "explanation"], minSeconds: 7 },
  NumberedList: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "ranked principles or ordered top-N items", tags: ["ranked", "ordered", "principles", "steps"], minSeconds: 8 },
  GlossaryCards: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "vocabulary, acronym glossary, or concept map", tags: ["glossary", "terms", "vocabulary", "definitions"], minSeconds: 8 },
  StepFlow: { category: "list", dataOwner: "content", bestAreas: ["left", "main"], useWhen: "4-6 sequential steps, each starting with an action verb", tags: ["process", "steps", "sequence", "workflow"], minSeconds: 7 },
  ComparisonCard: { category: "list", dataOwner: "content", bestAreas: ["main", "left"], useWhen: "head-to-head pros vs cons of one subject", tags: ["comparison", "pros", "cons", "tradeoffs"], minSeconds: 8 },
  TwoColumnLayout: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "parallel comparison of two subjects (before/after, X vs Y)", tags: ["comparison", "parallel", "before-after", "two-column"], minSeconds: 8 },
  SplitScreen: { category: "code", dataOwner: "content", bestAreas: ["main"], useWhen: "text bullets and a code snippet together", tags: ["code", "hybrid", "text"], minSeconds: 8 },
  CodeBlock: { category: "code", dataOwner: "content", bestAreas: ["right", "main", "sidebar"], useWhen: "10-18 lines of real production code", tags: ["code", "implementation", "config", "snippet"], minSeconds: 8 },
  TerminalCLI: { category: "code", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a command plus its streamed terminal output", tags: ["terminal", "cli", "command", "shell", "debug"], minSeconds: 9 },
  HttpExchange: { category: "code", dataOwner: "content", bestAreas: ["main", "panel"], useWhen: "an HTTP request/response pair (REST, API, protocol)", tags: ["http", "api", "rest", "request", "protocol"], minSeconds: 9 },
  MathFormula: { category: "math", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a single key equation or Big-O expression", tags: ["math", "formula", "equation", "big-o", "notation"], minSeconds: 6 },
  EquationDerivation: { category: "math", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a multi-step proof or algebraic derivation", tags: ["math", "proof", "derivation", "steps"], minSeconds: 10 },
  StatCallout: { category: "chart", dataOwner: "visual", bestAreas: ["sidebar", "right"], useWhen: "one surprising real-world number", tags: ["stat", "metric", "number", "benchmark"], minSeconds: 4 },
  BarChart: { category: "chart", dataOwner: "visual", bestAreas: ["right", "sidebar"], useWhen: "compare 4-6 real numeric values", tags: ["chart", "comparison", "benchmark", "metrics", "latency", "throughput"], minSeconds: 7 },
  LineChart: { category: "chart", dataOwner: "visual", bestAreas: ["main", "right"], useWhen: "trends over time, growth curves, latency vs load", tags: ["chart", "trend", "time-series", "growth", "curve"], minSeconds: 8 },
  PieChart: { category: "chart", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "proportional breakdown or traffic split", tags: ["chart", "proportion", "breakdown", "share", "split"], minSeconds: 7 },
  ArchitectureDiagram: { category: "network-diagram", dataOwner: "visual", bestAreas: ["main", "right"], useWhen: "system topology with servers, DBs, load balancers", tags: ["architecture", "topology", "system", "infrastructure", "diagram"], minSeconds: 9 },
  PacketFlow: { category: "network-diagram", dataOwner: "visual", bestAreas: ["main", "panel"], useWhen: "data packets traveling a network (protocols, routing)", tags: ["network", "packet", "protocol", "routing", "tcp"], minSeconds: 9 },
  HashRing: { category: "network-diagram", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "consistent hashing, sharding, CDN/cache placement", tags: ["hashing", "sharding", "cache", "distributed", "ring"], minSeconds: 10 },
  SequenceDiagram: { category: "sequence", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "time-ordered messages between actors/services", tags: ["sequence", "messages", "api-flow", "microservice", "auth"], minSeconds: 9 },
  StateMachine: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "finite states and transitions (protocols, FSMs)", tags: ["state-machine", "fsm", "protocol", "transitions", "raft"], minSeconds: 9 },
  TreeHierarchy: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "hierarchical structure (B-tree, DNS, file system, org)", tags: ["tree", "hierarchy", "b-tree", "dns", "recursion"], minSeconds: 8 },
  FlowDiagram: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "branching workflow with decisions (if/else logic)", tags: ["flowchart", "branching", "decision", "workflow", "algorithm"], minSeconds: 9 },
  TimelineFlow: { category: "timeline", dataOwner: "visual", bestAreas: ["main", "panel"], useWhen: "chronological history with real dates and events", tags: ["timeline", "history", "chronology", "roadmap", "events"], minSeconds: 8 },
};

export const COMPONENT_CATALOG = {
  AnimatedTitle: {
    description: "A large title with an optional subtitle and an animated underline. Good for intros and transitions.",
    schema: toJsonSchema(AnimatedTitleSchema, "AnimatedTitleProps"),
  },
  ComparisonCard: {
    description: "A card displaying a side-by-side comparison with pros and cons. Good for evaluating options.",
    schema: toJsonSchema(ComparisonCardSchema, "ComparisonCardProps"),
  },
  BulletList: {
    description: "A bulleted or numbered list with staggered reveal animation.",
    schema: toJsonSchema(BulletListSchema, "BulletListProps"),
  },
  StepFlow: {
    description: "A horizontal step-by-step flow diagram with an animated connector line.",
    schema: toJsonSchema(StepFlowSchema, "StepFlowProps"),
  },
  StatCallout: {
    description: "A large statistic callout with an animated counting number.",
    schema: toJsonSchema(StatCalloutSchema, "StatCalloutProps"),
  },
  ArchitectureDiagram: {
    description: "Renders an architecture diagram with servers, databases, and load balancers connected by animated data streams and arrows. Specify nodes and connections.",
    schema: toJsonSchema(ArchitectureDiagramSchema, "ArchitectureDiagramProps"),
  },
  SplitScreen: {
    description: "A layout scene showing a title, bullet points, code snippets, and optional media on the right side. Great for explaining technical concepts.",
    schema: toJsonSchema(SplitScreenSchema, "SplitScreenProps"),
  },
  TypewriterText: {
    description: "Animated typewriter effect with a blinking cursor. Reveals one or more lines of text character by character. Great for code reveals or dramatic text.",
    schema: toJsonSchema(TypewriterTextSchema, "TypewriterTextProps"),
  },
  TimelineFlow: {
    description: "An animated vertical or horizontal timeline with events appearing in staggered sequence. Use for history, roadmaps, or step-by-step processes.",
    schema: toJsonSchema(TimelineFlowSchema, "TimelineFlowProps"),
  },
  QuoteCard: {
    description: "A full-screen animated pull quote with an optional highlight sweep on key words and author attribution. Great for testimonials and impactful statements.",
    schema: toJsonSchema(QuoteCardSchema, "QuoteCardProps"),
  },
  CodeBlock: {
    description: "A macOS-style code window with syntax highlighting, line numbers, and optional line-by-line reveal animation. Ideal for showing code examples.",
    schema: toJsonSchema(CodeBlockSchema, "CodeBlockProps"),
  },
  TwoColumnLayout: {
    description: "A two-column comparison layout with an animated center divider. Each column has a heading and bullet points that slide in from opposite sides.",
    schema: toJsonSchema(TwoColumnLayoutSchema, "TwoColumnLayoutProps"),
  },
  BarChart: {
    description: "An animated bar chart with vertical or horizontal layout. Bars grow in with spring physics and values count up from 0. Use for data comparisons.",
    schema: toJsonSchema(BarChartSchema, "BarChartProps"),
  },
  PacketFlow: {
    description: "An animated network topology where data packets travel along edges between nodes. Nodes are positioned by x/y percentage coordinates. Ideal for showing network protocols, request routing, TCP handshakes, and distributed system data flows.",
    schema: toJsonSchema(PacketFlowSchema, "PacketFlowProps"),
  },
  HttpExchange: {
    description: "A side-by-side HTTP request and response viewer with line-by-line animated reveal. Shows method, path, headers, and body for both request and response. Great for explaining APIs, REST calls, and HTTP protocol details.",
    schema: toJsonSchema(HttpExchangeSchema, "HttpExchangeProps"),
  },
  HashRing: {
    description: "A consistent hashing ring with virtual nodes, server placement, and animated key lookups. Use for distributed caches, sharded databases, CDNs, and any consistent-hashing explanation.",
    schema: toJsonSchema(HashRingSchema, "HashRingProps"),
  },
  StateMachine: {
    description: "An animated finite-state machine with state boxes, labeled transition arrows, and a pulsing active state. Use for protocol diagrams (TCP handshake, Raft consensus), cache coherence, and workflow states.",
    schema: toJsonSchema(StateMachineSchema, "StateMachineProps"),
  },
  TreeHierarchy: {
    description: "A top-down tree diagram with auto-laid-out nodes and curved connectors. Use for B-trees, DNS hierarchy, recursion trees, file systems, org charts, and classification.",
    schema: toJsonSchema(TreeHierarchySchema, "TreeHierarchyProps"),
  },
  SequenceDiagram: {
    description: "A UML-style sequence diagram with actor lifelines and time-ordered request/response arrows. Use for API flows, microservice communication, and authentication sequences.",
    schema: toJsonSchema(SequenceDiagramSchema, "SequenceDiagramProps"),
  },
  LineChart: {
    description: "An animated multi-series line chart with optional area fill, grid lines, and legend. Lines draw in over time. Use for trends, growth curves, latency vs load, and any time-series comparison.",
    schema: toJsonSchema(LineChartSchema, "LineChartProps"),
  },
  MathFormula: {
    description: "A centered formula display with token-based rendering for variables, numbers, fractions, exponents, subscripts, square roots, and sums. Use for Big-O notation, equations, and math derivations.",
    schema: toJsonSchema(MathFormulaSchema, "MathFormulaProps"),
  },
  EquationDerivation: {
    description: "A vertical stack of formula steps connected by arrows, with optional justifications. Each step is a complete formula that can highlight independently. Use for proof walks and algebraic transformations.",
    schema: toJsonSchema(EquationDerivationSchema, "EquationDerivationProps"),
  },
  TerminalCLI: {
    description: "An animated terminal/CLI window that types a command then streams output line by line. Themes: dark, matrix, amber. Use for tutorials, debugging flows, and showing command output.",
    schema: toJsonSchema(TerminalCLISchema, "TerminalCLIProps"),
  },
  PieChart: {
    description: "An animated pie or donut chart with a sweeping reveal, percentage labels, an optional center label, and a side legend with values. Use for proportional breakdowns.",
    schema: toJsonSchema(PieChartSchema, "PieChartProps"),
  },
  NumberedList: {
    description: "A list of numbered cards with large colored badges, headings, and descriptions. Stack (vertical) or grid (2-column) layout. Use for ranked steps, principles, and ordered concepts.",
    schema: toJsonSchema(NumberedListSchema, "NumberedListProps"),
  },
  GlossaryCards: {
    description: "A grid of term/definition cards with colored icon tiles. Auto-detects 2- or 3-column layout. Use for vocabulary sections, acronym glossaries, and concept maps.",
    schema: toJsonSchema(GlossaryCardsSchema, "GlossaryCardsProps"),
  },
  FlowDiagram: {
    description: "A branching flow diagram with process (rectangle), decision (diamond), and start/end (pill) shapes connected by labeled arrows. Use for workflows, conditional logic, and algorithms with branching.",
    schema: toJsonSchema(FlowDiagramSchema, "FlowDiagramProps"),
  },
  CalloutAnnotation: {
    description: "A highlighted callout box with corner brackets, a side arrow, and optional bullet points. Use to emphasize a key insight or definition against a darker background.",
    schema: toJsonSchema(CalloutAnnotationSchema, "CalloutAnnotationProps"),
  },
};

export type SceneType = keyof typeof COMPONENT_REGISTRY;
