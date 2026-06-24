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
