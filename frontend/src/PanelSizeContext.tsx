/**
 * PanelSizeContext.tsx
 *
 * DynamicVideo renders each component into a fixed-width "design box" that is then
 * scaled to fit its actual grid cell (see PanelCell). Components that lay out
 * against the canvas size must use the DESIGN BOX size — not the full composition
 * size from `useVideoConfig()` — so they fill the box the wrapper scales.
 *
 * `usePanelSize()` returns the design box when inside a panel, else falls back to
 * the full composition size (so a component rendered outside DynamicVideo, e.g. a
 * standalone Studio preview, still works).
 */
import React, { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";

export type PanelSize = { width: number; height: number };

const PanelSizeContext = createContext<PanelSize | null>(null);

export const PanelSizeProvider: React.FC<{
  size: PanelSize;
  children: React.ReactNode;
}> = ({ size, children }) => (
  <PanelSizeContext.Provider value={size}>{children}</PanelSizeContext.Provider>
);

export const usePanelSize = (): PanelSize => {
  const ctx = useContext(PanelSizeContext);
  const { width, height } = useVideoConfig();
  return ctx ?? { width, height };
};
