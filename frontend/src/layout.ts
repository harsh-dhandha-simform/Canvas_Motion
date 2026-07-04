/**
 * layout.ts — pure panel fraction/size math (no React), shared by DynamicVideo
 * and the layout self-check. Kept side-effect-free so it can be unit-tested.
 */
import { COMPONENT_META, SceneType } from "./registry";

// Every component is authored against a 1920-wide design canvas; a panel renders
// its component at this width and is uniformly scaled to fit its actual cell.
export const DESIGN_W = 1920;

// When the Director gives no size_ratio signal, infer a panel's relative width
// from its component category so a diagram beside text isn't a rigid 50/50 split.
export const CATEGORY_WEIGHT: Record<string, number> = {
  title: 1,
  text: 1,
  list: 1,
  code: 1,
  math: 1,
  chart: 1.3,
  timeline: 1.3,
  "network-diagram": 1.8,
  "state-tree": 1.8,
  sequence: 1.8,
  algorithm: 1.8,
};

export const panelWeight = (type: string): number => {
  const cat = COMPONENT_META[type as SceneType]?.category;
  return (cat && CATEGORY_WEIGHT[cat]) || 1;
};

export type PanelLike = { area: string; type: string; size_ratio?: number };

/**
 * Relative width fraction per grid area. Honors explicit `size_ratio` when the
 * Director gave a real signal (≥2 distinct positive ratios); otherwise infers
 * each area's width from its component category.
 */
export function computeFractions(
  areaNames: string[],
  panels: PanelLike[],
): Record<string, number> {
  const byArea = (a: string) => panels.find((p) => p.area === a);
  const explicit = areaNames.map((a) => byArea(a)?.size_ratio);
  const distinct = new Set(
    explicit.filter((r): r is number => typeof r === "number" && r > 0),
  );
  const hasSignal = areaNames.length > 1 && distinct.size >= 2;

  const fr: Record<string, number> = {};
  areaNames.forEach((a, i) => {
    if (hasSignal) {
      const r = explicit[i];
      fr[a] = typeof r === "number" && r > 0 ? r : 1;
    } else {
      const p = byArea(a);
      fr[a] = p ? panelWeight(p.type) : 1;
    }
  });
  return fr;
}

/** Pixel width per area given fractions and the full content width (gap = 0). */
export function cellWidths(
  areaNames: string[],
  fr: Record<string, number>,
  contentWidth: number,
): Record<string, number> {
  const sum = areaNames.reduce((s, a) => s + (fr[a] || 0), 0) || 1;
  const out: Record<string, number> = {};
  areaNames.forEach((a) => {
    out[a] = contentWidth * ((fr[a] || 0) / sum);
  });
  return out;
}
