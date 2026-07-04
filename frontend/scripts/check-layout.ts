// check-layout.ts — framework-free self-check for the panel fraction/size math.
// Run: npx tsx scripts/check-layout.ts

import assert from "node:assert";
import { computeFractions, cellWidths, panelWeight, DESIGN_W } from "../src/layout";

// 1. Explicit size_ratio (≥2 distinct) is honored verbatim.
{
  const areas = ["main", "sidebar"];
  const fr = computeFractions(areas, [
    { area: "main", type: "ArchitectureDiagram", size_ratio: 2 },
    { area: "sidebar", type: "BulletList", size_ratio: 1 },
  ]);
  assert(fr.main === 2 && fr.sidebar === 1, "explicit ratios must be honored");
}

// 2. No ratio signal → infer from component category, and it is NOT 50/50.
{
  const areas = ["main", "sidebar"];
  const fr = computeFractions(areas, [
    { area: "main", type: "ArchitectureDiagram" },
    { area: "sidebar", type: "BulletList" },
  ]);
  assert(fr.main === panelWeight("ArchitectureDiagram"), "diagram uses category weight");
  assert(fr.sidebar === panelWeight("BulletList"), "text uses category weight");
  assert(fr.main > fr.sidebar, "diagram must be wider than text (not rigid 50/50)");
}

// 3. All-equal explicit ratios carry no signal → category inference kicks in.
{
  const areas = ["main", "sidebar"];
  const fr = computeFractions(areas, [
    { area: "main", type: "BarChart", size_ratio: 1 },
    { area: "sidebar", type: "BulletList", size_ratio: 1 },
  ]);
  assert(fr.main === panelWeight("BarChart") && fr.sidebar === 1, "all-equal ratios ignored → category used");
}

// 4. Two text panels split evenly.
{
  const areas = ["left", "right"];
  const fr = computeFractions(areas, [
    { area: "left", type: "BulletList" },
    { area: "right", type: "CalloutAnnotation" },
  ]);
  assert(fr.left === fr.right, "two text panels split evenly");
}

// 5. Cell widths sum to the content width and follow the fractions.
{
  const areas = ["main", "sidebar"];
  const fr = computeFractions(areas, [
    { area: "main", type: "ArchitectureDiagram", size_ratio: 2 },
    { area: "sidebar", type: "BulletList", size_ratio: 1 },
  ]);
  const cw = cellWidths(areas, fr, 1920);
  assert(Math.abs(cw.main + cw.sidebar - 1920) < 1e-6, "cell widths sum to content width");
  assert(cw.main > cw.sidebar, "wider fraction → wider cell");
}

// 6. Single-area layout fills the full width → scale === 1 (no regression).
{
  const areas = ["panel"];
  const fr = computeFractions(areas, [{ area: "panel", type: "AnimatedTitle" }]);
  const cw = cellWidths(areas, fr, 1920);
  assert(cw.panel === 1920, "single area fills the full width");
  assert(cw.panel / DESIGN_W === 1, "full-width panel → scale 1 (no regression)");
}

console.log("✓ layout math: explicit ratios honored, category inference is non-equal, cells fill width, full-width scale=1");
console.log("\nAll layout self-checks passed.");
