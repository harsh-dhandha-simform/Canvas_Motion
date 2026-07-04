// The central design system (MASTER_CONTEXT.md §4 principle 6: "design system, not
// ad-hoc styling"). Scene templates read colors/fonts/spacing/radii/motion/effects
// from here — nothing hardcodes a style value inline. `theme` selects a token set;
// the plan's primaryColor/backgroundColor/fontFamily (chosen deterministically by
// video_plan_builder.py from config, never raw LLM output) parameterize it.

import {Node} from "@revideo/2d";
import {all, easeInOutCubic, easeOutBack, easeOutCubic, ThreadGenerator} from "@revideo/core";
import {AnimationPreset, VideoStyle} from "../types";

export interface DesignTokens {
  colors: {
    background: string;
    backgroundAlt: string; // second stop for the backdrop gradient
    surface: string; // elevated card fill
    surfaceAlt: string; // second stop for card gradients / nested surfaces
    text: string;
    textMuted: string;
    primary: string; // main accent (from plan)
    primaryText: string;
    accent: string; // secondary accent for variety
    border: string;
    highlight: string;
    glow: string; // soft accent used for backdrop glows + shadows
    diagramNode: string;
    diagramNodeText: string;
    diagramEdge: string;
    codeBackground: string;
    correct: string;
    incorrect: string;
  };
  font: {
    family: string;
    sizeXL: number;
    sizeLG: number;
    sizeMD: number;
    sizeSM: number;
    weightBold: number;
    weightRegular: number;
    letterSpacing: number;
  };
  spacing: (units: number) => number;
  radius: { sm: number; md: number; lg: number };
  motion: { fast: number; base: number; slow: number };
  // Elevation shadow applied to cards / floating surfaces so they read as layered,
  // not flat. Dark themes use a deep soft shadow; light themes a subtle grey one.
  elevation: { color: string; blur: number; offsetY: number };
  // Whether this theme is dark — lets components pick e.g. glow vs drop-shadow.
  dark: boolean;
}

interface Palette {
  dark: boolean;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primaryText: string;
  accent: string;
  border: string;
  highlight: string;
  glow: string;
  diagramNode: string;
  diagramNodeText: string;
  diagramEdge: string;
  codeBackground: string;
  correct: string;
  incorrect: string;
  elevation: { color: string; blur: number; offsetY: number };
}

function tokensFrom(style: VideoStyle, p: Palette): DesignTokens {
  return {
    colors: {
      background: style.backgroundColor || p.background,
      backgroundAlt: p.backgroundAlt,
      surface: p.surface,
      surfaceAlt: p.surfaceAlt,
      text: p.text,
      textMuted: p.textMuted,
      primary: style.primaryColor || p.accent, // plan drives the main accent
      primaryText: p.primaryText,
      accent: p.accent,
      border: p.border,
      highlight: p.highlight,
      glow: p.glow,
      diagramNode: p.diagramNode,
      diagramNodeText: p.diagramNodeText,
      diagramEdge: p.diagramEdge,
      codeBackground: p.codeBackground,
      correct: p.correct,
      incorrect: p.incorrect,
    },
    font: {
      family: style.fontFamily,
      sizeXL: 78,
      sizeLG: 54,
      sizeMD: 36,
      sizeSM: 28,
      weightBold: 700,
      weightRegular: 400,
      letterSpacing: 0.2,
    },
    spacing: (units: number) => units * 8,
    radius: { sm: 10, md: 18, lg: 32 },
    motion: { fast: 0.25, base: 0.5, slow: 0.9 },
    elevation: p.elevation,
    dark: p.dark,
  };
}

// Dark matte — a calm, premium dark palette (Tokyo-Night family): matte blue-charcoal
// background, soft (not pure-white) text, one cool accent from the plan plus a warm
// secondary accent. Reads well on screens and looks far richer than flat white.
const DARK_MATTE: Palette = {
  dark: true,
  background: "#1a1b26",
  backgroundAlt: "#13141c",
  surface: "#232538",
  surfaceAlt: "#2b2e46",
  text: "#c8d0f0",
  textMuted: "#7f88b3",
  primaryText: "#0d0f1a",
  accent: "#bb9af7", // soft violet secondary accent
  border: "#343954",
  highlight: "#e0af68", // warm amber for keyword highlights
  glow: "#7aa2f7",
  diagramNode: "#232538",
  diagramNodeText: "#c8d0f0",
  diagramEdge: "#565f89",
  codeBackground: "#16161e",
  correct: "#9ece6a",
  incorrect: "#f7768e",
  elevation: { color: "rgba(0, 0, 0, 0.55)", blur: 48, offsetY: 18 },
};

// A polished light theme kept available (not flat white): off-white surfaces, soft
// grey shadows. Still selectable via config's video.theme = education_clean.
const EDUCATION_CLEAN: Palette = {
  dark: false,
  background: "#f5f7fb",
  backgroundAlt: "#e9edf5",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#475569",
  primaryText: "#ffffff",
  accent: "#8b5cf6",
  border: "#e2e8f0",
  highlight: "#f59e0b",
  glow: "#93c5fd",
  diagramNode: "#ffffff",
  diagramNodeText: "#0f172a",
  diagramEdge: "#64748b",
  codeBackground: "#0f172a",
  correct: "#22c55e",
  incorrect: "#ef4444",
  elevation: { color: "rgba(15, 23, 42, 0.14)", blur: 32, offsetY: 12 },
};

// Adding a new theme is pure data here — no scene template changes.
const THEMES: Record<string, Palette> = {
  dark_matte: DARK_MATTE,
  education_clean: EDUCATION_CLEAN,
};

export function getDesignTokens(style: VideoStyle): DesignTokens {
  const palette = THEMES[style.theme] ?? DARK_MATTE;
  return tokensFrom(style, palette);
}

// ---------------------------------------------------------------------------
// Motion presets. Entrances combine opacity + a little translate/scale so scenes
// feel alive rather than hard-cutting in. Exits mirror them.
// ---------------------------------------------------------------------------

/** Plays `preset` as an entrance (from an "in" state to rest). */
export function* playEntrance(node: Node, preset: AnimationPreset, duration: number): ThreadGenerator {
  switch (preset) {
    case "fadeIn": {
      const restY = node.position.y();
      node.opacity(0);
      node.position.y(restY + 24);
      yield* all(
        node.opacity(1, duration, easeOutCubic),
        node.position.y(restY, duration, easeOutCubic),
      );
      break;
    }
    case "slideUp": {
      const restY = node.position.y();
      node.opacity(0);
      node.position.y(restY + 80);
      yield* all(
        node.opacity(1, duration, easeOutCubic),
        node.position.y(restY, duration, easeInOutCubic),
      );
      break;
    }
    case "popIn":
      node.opacity(0);
      node.scale(0.8);
      yield* all(node.opacity(1, duration, easeOutCubic), node.scale(1, duration, easeOutBack));
      break;
    case "none":
    default:
      node.opacity(1);
      break;
  }
}

/** Mirrors `preset` as an exit (rest back to an "out" state); `none` is a hard cut. */
export function* playExit(node: Node, preset: AnimationPreset, duration: number): ThreadGenerator {
  switch (preset) {
    case "fadeIn": {
      const restY = node.position.y();
      yield* all(
        node.opacity(0, duration, easeInOutCubic),
        node.position.y(restY - 24, duration, easeInOutCubic),
      );
      break;
    }
    case "slideUp": {
      const restY = node.position.y();
      yield* all(
        node.opacity(0, duration, easeInOutCubic),
        node.position.y(restY - 80, duration, easeInOutCubic),
      );
      break;
    }
    case "popIn":
      yield* all(node.opacity(0, duration, easeInOutCubic), node.scale(0.9, duration, easeInOutCubic));
      break;
    case "none":
    default:
      node.opacity(0);
      break;
  }
}
