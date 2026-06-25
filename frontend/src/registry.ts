/**
 * src/registry.ts
 *
 * Maps scene type names (as produced by the backend JSON) to the actual
 * imported React components. This is the single file you touch when adding
 * a new scene component to the library.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJsonSchema = (schema: any, name: string) => zodToJsonSchema(schema, name);

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
