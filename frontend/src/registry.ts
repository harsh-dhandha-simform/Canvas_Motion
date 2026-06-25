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
};

export type SceneType = keyof typeof COMPONENT_REGISTRY;
