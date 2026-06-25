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
