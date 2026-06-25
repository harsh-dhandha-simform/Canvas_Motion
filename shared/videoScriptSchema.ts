/**
 * shared/videoScriptSchema.ts
 *
 * Source-of-truth TypeScript types for the video script JSON produced by the
 * backend and consumed by the Remotion frontend.
 *
 * Every SceneType must 1-to-1 match a file in frontend/src/components/.
 * The `data` field of each scene must exactly match that component's props.
 *
 * HOW TO ADD A NEW COMPONENT:
 *   1. Create frontend/src/components/NewComponent.tsx with a typed props interface.
 *   2. Add one line to frontend/src/registry.ts.
 *   3. Add the component + props description to build_system_prompt() in backend/server.py.
 *   4. Add the new props type here and union it into SceneData.
 */

// ---------------------------------------------------------------------------
// Per-component data shapes — must match each component's props interface
// ---------------------------------------------------------------------------

/** Maps to frontend/src/components/AnimatedTitle.tsx */
export type AnimatedTitleData = {
  title: string;
  subtitle?: string;
  accentColor?: string;
  align?: "center" | "left";
};

/** Maps to frontend/src/components/ComparisonCard.tsx */
export type ComparisonCardData = {
  title: string;
  pros: string[];
  cons: string[];
  accentColor?: string;
  visibleCount?: number;
};

/** Maps to frontend/src/components/BulletList.tsx */
export type BulletListData = {
  title: string;
  items: string[];
  accentColor?: string;
  numbered?: boolean;
  align?: "left" | "center";
};

/** Maps to frontend/src/components/StepFlow.tsx */
export type StepFlowData = {
  title: string;
  steps: string[];
  accentColor?: string;
};

/** Maps to frontend/src/components/StatCallout.tsx */
export type StatCalloutData = {
  title: string;
  value: number;
  suffix?: string;
  description?: string;
  accentColor?: string;
};

export type ArchitectureDiagramData = {
  title: string;
  nodes?: {
    id: string;
    type: "server" | "loadBalancer" | "database" | "client";
    x: number;
    y: number;
    label?: string;
    metrics?: { cpu?: string; ram?: string };
  }[];
  connections?: {
    fromId: string;
    toId: string;
    type: "stream" | "arrow";
    label?: string;
  }[];
  accentColor?: string;
};

export type SplitScreenData = {
  title: string;
  subtitle?: string;
  accentColor?: string;
  bullets?: string[];
  codeSnippet?: {
    code: string;
    language: string;
  };
  mediaUrl?: string;
};

// ---------------------------------------------------------------------------
// New components (added 2026-06-25)
// ---------------------------------------------------------------------------

export type HashRingData = {
  title?: string;
  servers: string[];
  virtualNodesPerServer?: number;
  lookupKeys?: string[];
  ticks?: number;
  accentColor?: string;
  showLegend?: boolean;
};

export type StateMachineData = {
  title?: string;
  states: {
    id: string;
    label: string;
    color?: string;
    description?: string;
  }[];
  transitions: {
    fromId: string;
    toId: string;
    label: string;
    highlight?: boolean;
  }[];
  activeStateId?: string;
  accentColor?: string;
};

export type TreeHierarchyData = {
  title?: string;
  root: {
    label: string;
    description?: string;
    color?: string;
    children?: {
      label: string;
      description?: string;
      color?: string;
      children?: { label: string; description?: string; color?: string }[];
    }[];
  };
  accentColor?: string;
  direction?: "down" | "right";
};

export type SequenceDiagramData = {
  title?: string;
  actors: string[];
  messages: {
    fromIdx: number;
    toIdx: number;
    label: string;
    kind?: "sync" | "return" | "async";
    active?: boolean;
  }[];
  activations?: {
    actorIdx: number;
    startMessage: number;
    endMessage: number;
    label?: string;
  }[];
  accentColor?: string;
};

export type LineChartData = {
  title?: string;
  xLabels: string[];
  series: {
    name: string;
    color?: string;
    values: number[];
    fill?: boolean;
  }[];
  yLabel?: string;
  xLabel?: string;
  accentColor?: string;
  showLegend?: boolean;
  highlightIndex?: number;
};

export type MathFormulaToken =
  | { type: "text"; value: string; color?: string }
  | { type: "var"; value: string; color?: string }
  | { type: "num"; value: string; color?: string }
  | { type: "op"; value: string; color?: string }
  | { type: "frac"; numerator: MathFormulaToken[]; denominator: MathFormulaToken[]; color?: string }
  | { type: "sup"; base: MathFormulaToken[]; exponent: MathFormulaToken[]; color?: string }
  | { type: "sub"; base: MathFormulaToken[]; subscript: MathFormulaToken[]; color?: string }
  | { type: "sqrt"; body: MathFormulaToken[]; color?: string }
  | { type: "sum"; lower: MathFormulaToken[]; upper: MathFormulaToken[]; body: MathFormulaToken[]; color?: string }
  | { type: "space" };

export type MathFormulaData = {
  title?: string;
  tokens: MathFormulaToken[];
  description?: string;
  accentColor?: string;
};

export type EquationDerivationData = {
  title?: string;
  steps: {
    label?: string;
    tokens: MathFormulaToken[];
    highlight?: boolean;
    final?: boolean;
    note?: string;
  }[];
  accentColor?: string;
};

export type TerminalCLIData = {
  title?: string;
  command: string;
  output: string[];
  typingCommand?: boolean;
  outputLineDelay?: number;
  typingSpeed?: number;
  caption?: string;
  accentColor?: string;
  highlightLines?: number[];
  theme?: "dark" | "matrix" | "amber";
};

export type PieChartData = {
  title?: string;
  slices: { label: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string;
  variant?: "pie" | "donut";
  accentColor?: string;
  showLegend?: boolean;
  highlightIndex?: number;
};

export type NumberedListData = {
  title?: string;
  items: { heading: string; description?: string; color?: string; icon?: string }[];
  accentColor?: string;
  layout?: "stack" | "grid";
};

export type GlossaryCardsData = {
  title?: string;
  terms: { term: string; definition: string; icon?: string; color?: string }[];
  grid?: "auto" | "2x2" | "2x3" | "3x2" | "3x3";
  accentColor?: string;
};

export type FlowDiagramData = {
  title?: string;
  nodes: {
    id: string;
    label: string;
    kind?: "process" | "decision" | "start" | "end";
    description?: string;
    color?: string;
  }[];
  edges: { fromId: string; toId: string; label?: string; active?: boolean }[];
  accentColor?: string;
};

export type CalloutAnnotationData = {
  title?: string;
  body: string;
  bullets?: string[];
  position?: "left" | "right" | "top" | "bottom";
  accentColor?: string;
};

// ---------------------------------------------------------------------------
// Discriminated union: scene type + matching data
// ---------------------------------------------------------------------------

export type Scene =
  | {
      id: string;
      type: "AnimatedTitle";
      duration_frames: number;
      transition: TransitionType;
      data: AnimatedTitleData;
    }
  | {
      id: string;
      type: "ComparisonCard";
      duration_frames: number;
      transition: TransitionType;
      data: ComparisonCardData;
    }
  | {
      id: string;
      type: "BulletList";
      duration_frames: number;
      transition: TransitionType;
      data: BulletListData;
    }
  | {
      id: string;
      type: "StepFlow";
      duration_frames: number;
      transition: TransitionType;
      data: StepFlowData;
    }
  | {
      id: string;
      type: "StatCallout";
      duration_frames: number;
      transition: TransitionType;
      data: StatCalloutData;
    }
  | {
      id: string;
      type: "ArchitectureDiagram";
      duration_frames: number;
      transition: TransitionType;
      data: ArchitectureDiagramData;
    }
  | {
      id: string;
      type: "SplitScreen";
      duration_frames: number;
      transition: TransitionType;
      data: SplitScreenData;
    }
  | {
      id: string;
      type: "HashRing";
      duration_frames: number;
      transition: TransitionType;
      data: HashRingData;
    }
  | {
      id: string;
      type: "StateMachine";
      duration_frames: number;
      transition: TransitionType;
      data: StateMachineData;
    }
  | {
      id: string;
      type: "TreeHierarchy";
      duration_frames: number;
      transition: TransitionType;
      data: TreeHierarchyData;
    }
  | {
      id: string;
      type: "SequenceDiagram";
      duration_frames: number;
      transition: TransitionType;
      data: SequenceDiagramData;
    }
  | {
      id: string;
      type: "LineChart";
      duration_frames: number;
      transition: TransitionType;
      data: LineChartData;
    }
  | {
      id: string;
      type: "MathFormula";
      duration_frames: number;
      transition: TransitionType;
      data: MathFormulaData;
    }
  | {
      id: string;
      type: "EquationDerivation";
      duration_frames: number;
      transition: TransitionType;
      data: EquationDerivationData;
    }
  | {
      id: string;
      type: "TerminalCLI";
      duration_frames: number;
      transition: TransitionType;
      data: TerminalCLIData;
    }
  | {
      id: string;
      type: "PieChart";
      duration_frames: number;
      transition: TransitionType;
      data: PieChartData;
    }
  | {
      id: string;
      type: "NumberedList";
      duration_frames: number;
      transition: TransitionType;
      data: NumberedListData;
    }
  | {
      id: string;
      type: "GlossaryCards";
      duration_frames: number;
      transition: TransitionType;
      data: GlossaryCardsData;
    }
  | {
      id: string;
      type: "FlowDiagram";
      duration_frames: number;
      transition: TransitionType;
      data: FlowDiagramData;
    }
  | {
      id: string;
      type: "CalloutAnnotation";
      duration_frames: number;
      transition: TransitionType;
      data: CalloutAnnotationData;
    };

/** All valid scene type names — must match a key in COMPONENT_REGISTRY */
export type SceneType = Scene["type"];

// ---------------------------------------------------------------------------
// Transition types
// ---------------------------------------------------------------------------

export type TransitionType = "fade" | "slideLeft" | "slideUp" | "zoom" | "none";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type Theme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  font: string;
};

// ---------------------------------------------------------------------------
// Top-level video script
// ---------------------------------------------------------------------------

export type VideoScript = {
  title: string;
  fps: 30;
  width: 1920;
  height: 1080;
  theme: Theme;
  scenes: Scene[];
};
