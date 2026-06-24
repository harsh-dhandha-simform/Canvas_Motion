/**
 * src/registry.ts
 *
 * Maps scene type names (as produced by the backend JSON) to the actual
 * imported React components. This is the single file you touch when adding
 * a new scene component to the library.
 *
 * HOW TO ADD A NEW COMPONENT:
 *   1. Create frontend/src/components/NewComponent.tsx
 *   2. Import it below and add one line to COMPONENT_REGISTRY
 *   3. Add its description + props to build_system_prompt() in backend/server.py
 *   4. Add its TypeScript type to shared/videoScriptSchema.ts
 */

import { AnimatedTitle } from "./components/AnimatedTitle";
import { ComparisonCard } from "./components/ComparisonCard";
// Add new component imports here — one line each

export const COMPONENT_REGISTRY = {
  AnimatedTitle,
  ComparisonCard,
  // Add new components here — one line each
} as const;

export type SceneType = keyof typeof COMPONENT_REGISTRY;
