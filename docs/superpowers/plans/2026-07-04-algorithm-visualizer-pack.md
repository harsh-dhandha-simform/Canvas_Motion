# Algorithm Visualizer Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-04-algorithm-visualizer-pack-design.md`

**Goal:** Ship six new Remotion scene components (`SortingVisualizer`, `DPTableVisualizer`, `ArrayAlgorithm`, `GraphTraversal`, `LinearStructure`, `RecursionTree`) that add algorithm and data-structure walkthrough visuals to the Canvas Motion library.

**Architecture:** Six components under `frontend/src/components/`, each with a Zod schema, an inferred TS type, an FC render, and (for four of them) a co-located `.steps.ts` generator. A new `_shared/anim.ts` file holds the pure helpers `mix()`, `stepAt()`, `resolveSteps()`. Wire-up is one edit to `src/registry.ts` (six imports + entries in `COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`, `COMPONENT_META`, `COMPONENT_CATALOG`, plus a new `"algorithm"` value in the `category` union). Each task ends with a preview `<Composition>` in `Root.tsx` and a visual verification in Remotion Studio.

**Tech Stack:** React 18, TypeScript, Remotion (`useCurrentFrame`, `useVideoConfig`, `interpolate`, `Easing`, `spring`), Zod v4, `zod-to-json-schema`.

## Global Constraints

- All motion via `useCurrentFrame()` + `interpolate()` / `spring()`. **No CSS `transition`, no CSS `animation`, no Tailwind `animate-*` classes** — they don't render in Remotion.
- Individual transform properties (`scale`, `translate`, `rotate`) inline in `style` — no composed `transform` strings.
- Pull palette from `useTheme()` (`primary`, `secondary`, `accent`, `background`, `font`). Every schema also exposes optional `accentColor?: string` and `speed?: number` (default `1`).
- Universal step timing: `stepDurationFrames = Math.round((1.2 / (props.speed ?? 1)) * fps)`. `REVEAL_FRAMES = 18` (~0.6 s at 30 fps).
- Palette conventions (from spec §3.2): inert cell fill `#1e293b`, cell border `#334155`, primary text `#f1f5f9`, muted text `#64748b`, pruned/rejected `#ef4444`. Active = `theme.accent`, secondary highlight = `theme.primary`, settled = `theme.secondary`.
- All components live in `frontend/src/components/`. Shared helpers under `frontend/src/components/_shared/` are **not** registered as scenes.
- Zod schemas export `<Name>Schema`; inferred type `<Name>Props = z.infer<typeof …Schema>`.
- Verification is **visual, in Remotion Studio** — no unit-test harness exists in this project (spec §9).
- Commits per task (feature-scoped): `feat(<component>): <short description>`.

---

## File Structure

**Created:**
- `frontend/src/components/_shared/anim.ts`
- `frontend/src/components/SortingVisualizer.tsx`
- `frontend/src/components/SortingVisualizer.steps.ts`
- `frontend/src/components/LinearStructure.tsx`
- `frontend/src/components/ArrayAlgorithm.tsx`
- `frontend/src/components/ArrayAlgorithm.steps.ts`
- `frontend/src/components/DPTableVisualizer.tsx`
- `frontend/src/components/GraphTraversal.tsx`
- `frontend/src/components/GraphTraversal.steps.ts`
- `frontend/src/components/RecursionTree.tsx`
- `frontend/src/components/RecursionTree.steps.ts`

**Modified:**
- `frontend/src/registry.ts` — add `"algorithm"` to category union; six imports; six entries each in `COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`, `COMPONENT_META`, `COMPONENT_CATALOG`.
- `frontend/src/Root.tsx` — add six preview `<Composition>` entries (dev previews; safe to keep or remove after ship).

---

## Task 0: Foundations — category union + shared helpers

**Files:**
- Create: `frontend/src/components/_shared/anim.ts`
- Modify: `frontend/src/registry.ts` (category union only)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `mix(a: string, b: string, t: number): string`
  - `stepAt(step: number, opts: { stepFrames: number; frame: number; fps: number }): { progress: number; entering: boolean }`
  - `resolveSteps<T>(explicit: T[] | undefined, generate: () => T[]): T[]`
  - `REVEAL_FRAMES: number` (constant `18`)
  - New `"algorithm"` value on `ComponentMeta['category']`.

- [ ] **Step 0.1: Create the shared helpers file**

Create `frontend/src/components/_shared/anim.ts`:

```ts
// Pure helpers shared by algorithm visualiser components.
// No React imports — safe to use in step generators too.

export const REVEAL_FRAMES = 18;

export function mix(a: string, b: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const bl = Math.round(ab + (bb - ab) * clamped);
  return "#" + toHex(r) + toHex(g) + toHex(bl);
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(v: number): string {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
}

export function stepAt(
  step: number,
  opts: { stepFrames: number; frame: number; fps: number }
): { progress: number; entering: boolean } {
  const start = step * opts.stepFrames;
  const local = opts.frame - start;
  const progress = Math.max(0, Math.min(1, local / opts.stepFrames));
  const entering = local >= 0 && local < REVEAL_FRAMES;
  return { progress, entering };
}

export function resolveSteps<T>(
  explicit: T[] | undefined,
  generate: () => T[]
): T[] {
  return explicit && explicit.length > 0 ? explicit : generate();
}
```

- [ ] **Step 0.2: Add `"algorithm"` to the category union**

Edit `frontend/src/registry.ts`. Find the `ComponentMeta` type (around lines 126–143). Change the `category` union to add `"algorithm"` at the end:

```ts
export type ComponentMeta = {
  category:
    | "text"
    | "list"
    | "code"
    | "chart"
    | "network-diagram"
    | "state-tree"
    | "sequence"
    | "math"
    | "timeline"
    | "title"
    | "algorithm";
  dataOwner: "content" | "visual";
  bestAreas: string[];
  useWhen: string;
  tags: string[];
  minSeconds: number;
};
```

- [ ] **Step 0.3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (the new category value is not yet referenced anywhere).

- [ ] **Step 0.4: Commit**

```bash
git add frontend/src/components/_shared/anim.ts frontend/src/registry.ts
git commit -m "feat(algo-pack): add shared anim helpers and algorithm category"
```

---

## Task 1: `SortingVisualizer`

**Files:**
- Create: `frontend/src/components/SortingVisualizer.tsx`
- Create: `frontend/src/components/SortingVisualizer.steps.ts`
- Modify: `frontend/src/registry.ts` (import + four registry blocks)
- Modify: `frontend/src/Root.tsx` (preview composition)

**Interfaces:**
- Consumes: `mix`, `stepAt`, `resolveSteps`, `REVEAL_FRAMES` from `_shared/anim`.
- Produces:
  - `SortingVisualizerSchema` (Zod)
  - `type SortingVisualizerProps = z.infer<typeof SortingVisualizerSchema>`
  - `SortingVisualizer: React.FC<SortingVisualizerProps>`
  - `generateSortSteps(algorithm, values): SortStep[]`
  - `type SortStep = { kind: "compare" | "swap" | "set" | "partition" | "merge-write"; indices: number[]; writeValue?: number; note?: string }`

- [ ] **Step 1.1: Create schema file with types**

Create `frontend/src/components/SortingVisualizer.tsx` with the schema and props type (component impl comes next):

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps, REVEAL_FRAMES } from "./_shared/anim";
import { generateSortSteps } from "./SortingVisualizer.steps";

export const SortStepSchema = z.object({
  kind: z.enum(["compare", "swap", "set", "partition", "merge-write"]),
  indices: z.array(z.number()),
  writeValue: z.number().optional(),
  note: z.string().optional(),
});

export const SortingVisualizerSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum(["bubble", "merge", "quick", "heap", "radix", "counting"]),
  values: z.array(z.number()),
  steps: z.array(SortStepSchema).optional(),
  speed: z.number().optional(),
  showComparisonCounter: z.boolean().optional(),
  accentColor: z.string().optional(),
});

export type SortStep = z.infer<typeof SortStepSchema>;
export type SortingVisualizerProps = z.infer<typeof SortingVisualizerSchema>;
```

- [ ] **Step 1.2: Create step generator with bubble + quick fully implemented**

Create `frontend/src/components/SortingVisualizer.steps.ts`:

```ts
import type { SortStep } from "./SortingVisualizer";

type Algorithm =
  | "bubble" | "merge" | "quick" | "heap" | "radix" | "counting";

export function generateSortSteps(
  algorithm: Algorithm,
  values: number[]
): SortStep[] {
  const arr = [...values];
  switch (algorithm) {
    case "bubble":   return bubbleSteps(arr);
    case "quick":    return quickSteps(arr, 0, arr.length - 1, []);
    case "merge":    return mergeSteps(arr);
    case "heap":     return heapSteps(arr);
    case "radix":    return radixSteps(arr);
    case "counting": return countingSteps(arr);
  }
}

function bubbleSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ kind: "compare", indices: [j, j + 1] });
      if (arr[j] > arr[j + 1]) {
        steps.push({ kind: "swap", indices: [j, j + 1] });
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return steps;
}

function quickSteps(
  arr: number[], lo: number, hi: number, steps: SortStep[]
): SortStep[] {
  if (lo >= hi) return steps;
  const pivot = arr[hi];
  steps.push({ kind: "partition", indices: [lo, hi], note: `pivot=${pivot}` });
  let i = lo;
  for (let j = lo; j < hi; j++) {
    steps.push({ kind: "compare", indices: [j, hi] });
    if (arr[j] < pivot) {
      if (i !== j) {
        steps.push({ kind: "swap", indices: [i, j] });
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      i++;
    }
  }
  steps.push({ kind: "swap", indices: [i, hi] });
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  quickSteps(arr, lo, i - 1, steps);
  quickSteps(arr, i + 1, hi, steps);
  return steps;
}

function mergeSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const aux = [...arr];
  function merge(lo: number, mid: number, hi: number) {
    for (let k = lo; k <= hi; k++) aux[k] = arr[k];
    let i = lo, j = mid + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > mid) { arr[k] = aux[j++]; }
      else if (j > hi) { arr[k] = aux[i++]; }
      else if (aux[j] < aux[i]) { arr[k] = aux[j++]; }
      else { arr[k] = aux[i++]; }
      steps.push({ kind: "merge-write", indices: [k], writeValue: arr[k] });
    }
  }
  function sort(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }
  sort(0, arr.length - 1);
  return steps;
}

function heapSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const n = arr.length;
  function siftDown(start: number, end: number) {
    let root = start;
    while (2 * root + 1 <= end) {
      const child = 2 * root + 1;
      let swap = root;
      if (arr[swap] < arr[child]) swap = child;
      if (child + 1 <= end && arr[swap] < arr[child + 1]) swap = child + 1;
      steps.push({ kind: "compare", indices: [root, child] });
      if (swap === root) return;
      steps.push({ kind: "swap", indices: [root, swap] });
      [arr[root], arr[swap]] = [arr[swap], arr[root]];
      root = swap;
    }
  }
  for (let start = Math.floor(n / 2) - 1; start >= 0; start--) siftDown(start, n - 1);
  for (let end = n - 1; end > 0; end--) {
    steps.push({ kind: "swap", indices: [0, end] });
    [arr[0], arr[end]] = [arr[end], arr[0]];
    siftDown(0, end - 1);
  }
  return steps;
}

function countingSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);
  for (const v of arr) count[v]++;
  let idx = 0;
  for (let v = 0; v <= max; v++) {
    while (count[v]-- > 0) {
      steps.push({ kind: "set", indices: [idx], writeValue: v });
      arr[idx] = v;
      idx++;
    }
  }
  return steps;
}

function radixSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const max = Math.max(...arr);
  let exp = 1;
  while (Math.floor(max / exp) > 0) {
    const output = new Array(arr.length).fill(0);
    const count = new Array(10).fill(0);
    for (const v of arr) count[Math.floor(v / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      output[count[digit] - 1] = arr[i];
      count[digit]--;
    }
    for (let i = 0; i < arr.length; i++) {
      steps.push({ kind: "set", indices: [i], writeValue: output[i] });
      arr[i] = output[i];
    }
    exp *= 10;
  }
  return steps;
}
```

- [ ] **Step 1.3: Implement the component with layout + entrance animation**

Append the FC to `frontend/src/components/SortingVisualizer.tsx`:

```tsx
export const SortingVisualizer: React.FC<SortingVisualizerProps> = ({
  title,
  algorithm,
  values,
  steps: explicitSteps,
  speed = 1,
  showComparisonCounter,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateSortSteps(algorithm, values)
  );
  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentStepIdx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress, entering } = stepAt(currentStepIdx, { stepFrames, frame, fps });

  // Reduce steps [0..currentStepIdx-1] to get the "settled" array; the current
  // step animates on top of that.
  const settled = reduceSortUpTo(steps, currentStepIdx, values);
  const activeStep = steps[currentStepIdx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const maxV = Math.max(...values);
  const barW = 60;
  const gap = 12;

  // Comparison counter (optional)
  const cmpCount = steps.slice(0, currentStepIdx + 1).filter(s => s.kind === "compare").length;
  const swapCount = steps.slice(0, currentStepIdx + 1).filter(s => s.kind === "swap").length;

  // Sorted-region tint: for bubble/heap, sorted grows from the right by count(swap-to-end).
  // For merge/quick/radix/counting we omit the tint (the settled array itself is the story).
  const sortedFromRight = algorithm === "bubble" || algorithm === "heap"
    ? swapCount   // rough heuristic; refine per-algorithm if needed
    : 0;

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background,
      fontFamily: `${theme.font}, sans-serif`,
    }}>
      {title && (
        <h2 style={{
          fontSize: 52, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1, display: "flex", alignItems: "flex-end",
        justifyContent: "center", gap,
        position: "relative",
      }}>
        {settled.map((v, i) => {
          const involved = activeStep?.indices.includes(i);
          const isPivot =
            activeStep?.kind === "partition" && i === activeStep.indices[1];
          const isSortedTail = i >= settled.length - sortedFromRight;

          // Base color logic
          let color = "#1e293b";
          let border = "#334155";
          if (isSortedTail) color = mix("#1e293b", theme.secondary, 0.4);
          if (involved) {
            if (activeStep.kind === "compare") color = mix(color, accent, entering ? progress / 0.3 : 1);
            if (activeStep.kind === "swap") color = mix(color, accent, 0.7);
            if (activeStep.kind === "set" || activeStep.kind === "merge-write")
              color = mix(color, accent, 0.8);
            if (isPivot) { color = theme.primary; border = theme.primary; }
          }

          // Swap animation: bars translate to swap partner's x
          let xOffset = 0;
          let yLift = 0;
          if (activeStep?.kind === "swap" && involved) {
            const [a, b] = activeStep.indices;
            const other = i === a ? b : a;
            const distance = (other - i) * (barW + gap);
            xOffset = interpolate(progress, [0, 1], [0, distance], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            });
            yLift = interpolate(progress, [0, 0.5, 1], [0, -20, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
          }

          // For `set` / `merge-write`, animate value change if this bar just wrote.
          let displayValue = v;
          if (
            (activeStep?.kind === "set" || activeStep?.kind === "merge-write") &&
            activeStep.indices[0] === i &&
            typeof activeStep.writeValue === "number"
          ) {
            const prev = i < settled.length ? settled[i] : 0;
            displayValue = interpolate(progress, [0, 1], [prev, activeStep.writeValue], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
          }

          const heightPct = (displayValue / maxV) * 100;

          return (
            <div key={i} style={{
              width: barW,
              display: "flex", flexDirection: "column", alignItems: "center",
              translate: `${xOffset}px ${yLift}px`,
              gap: 8,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
                {Math.round(displayValue)}
              </span>
              <div style={{
                width: "100%", height: `${heightPct}%`,
                minHeight: 4,
                background: color,
                border: `2px solid ${border}`,
                borderRadius: "6px 6px 0 0",
                boxShadow: involved ? `0 0 16px ${accent}70` : undefined,
              }} />
              <span style={{ fontSize: 13, color: "#64748b" }}>{i}</span>
            </div>
          );
        })}
      </div>

      {showComparisonCounter && (
        <div style={{
          position: "absolute", top: 60, right: 80,
          display: "flex", gap: 24, color: "#f1f5f9", fontSize: 18,
        }}>
          <span>comparisons: <strong style={{ color: accent }}>{cmpCount}</strong></span>
          <span>swaps: <strong style={{ color: theme.primary }}>{swapCount}</strong></span>
        </div>
      )}
    </div>
  );
};

function reduceSortUpTo(
  steps: SortStep[], k: number, initial: number[]
): number[] {
  const arr = [...initial];
  for (let i = 0; i < k; i++) {
    const s = steps[i];
    if (s.kind === "swap") {
      const [a, b] = s.indices;
      [arr[a], arr[b]] = [arr[b], arr[a]];
    } else if (
      (s.kind === "set" || s.kind === "merge-write") &&
      typeof s.writeValue === "number"
    ) {
      arr[s.indices[0]] = s.writeValue;
    }
  }
  return arr;
}
```

- [ ] **Step 1.4: Wire into registry**

Edit `frontend/src/registry.ts`. Add the import near the other `import { X, XSchema } from "./components/X"` lines:

```ts
import { SortingVisualizer, SortingVisualizerSchema } from "./components/SortingVisualizer";
```

Add to `COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`, `COMPONENT_META`, `COMPONENT_CATALOG`:

```ts
// In COMPONENT_REGISTRY:
SortingVisualizer,

// In COMPONENT_SCHEMAS:
SortingVisualizer: SortingVisualizerSchema,

// In COMPONENT_META:
SortingVisualizer: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["main", "panel"],
  useWhen: "a sorting algorithm being walked through, or comparing sort algorithms visually",
  tags: ["sort", "algorithm", "swap", "comparison", "complexity", "bubble", "merge", "quick", "heap", "radix"],
  minSeconds: 10,
},

// In COMPONENT_CATALOG:
SortingVisualizer: {
  description: "An animated sorting-algorithm walkthrough. Bars represent values; steps compare, swap, partition, set, or merge-write to visualise bubble / merge / quick / heap / radix / counting sort.",
  schema: toJsonSchema(SortingVisualizerSchema, "SortingVisualizerProps"),
},
```

- [ ] **Step 1.5: Add preview composition to Root.tsx**

Edit `frontend/src/Root.tsx`. Add the import:

```tsx
import { SortingVisualizer } from "./components/SortingVisualizer";
```

Inside the `<></>` fragment in `RemotionRoot`, after the `EXAMPLE_SCRIPTS.map(...)` block, add:

```tsx
<Composition
  id="preview-SortingVisualizer"
  component={SortingVisualizer}
  durationInFrames={30 * 15}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "Bubble sort",
    algorithm: "bubble" as const,
    values: [8, 3, 5, 1, 7, 2, 6, 4],
    showComparisonCounter: true,
  }}
/>
```

- [ ] **Step 1.6: Visual verification**

Run: `cd frontend && npx remotion studio`
Expected: Studio loads. Select the `preview-SortingVisualizer` composition. Verify:
- Bars enter with a stagger, sized by value.
- The two compared bars pulse `accent` on each `compare` step.
- Swapping bars translate to each other's x with a slight arc, and the values move with them.
- Comparisons/swaps counter ticks up.
- At the end of the timeline, the bars are sorted ascending left-to-right.

If any of the above fails, fix and re-verify before committing.

- [ ] **Step 1.7: Commit**

```bash
git add frontend/src/components/SortingVisualizer.tsx \
        frontend/src/components/SortingVisualizer.steps.ts \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add SortingVisualizer component"
```

---

## Task 2: `LinearStructure`

**Files:**
- Create: `frontend/src/components/LinearStructure.tsx`
- Modify: `frontend/src/registry.ts`
- Modify: `frontend/src/Root.tsx`

**Interfaces:**
- Consumes: `mix`, `stepAt` from `_shared/anim`.
- Produces:
  - `LinearStructureSchema` (Zod), `LinearStructureProps`
  - `LinearStructure: React.FC<LinearStructureProps>`

No generator file — `operations` are the steps.

- [ ] **Step 2.1: Create the component file with schema**

Create `frontend/src/components/LinearStructure.tsx`:

```tsx
import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing, spring,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";

export const LinearOpSchema = z.object({
  op: z.enum([
    "push", "pop",
    "enqueue", "dequeue",
    "push-front", "push-back",
    "pop-front", "pop-back",
    "insert-at", "delete-at",
    "read",
  ]),
  value: z.union([z.number(), z.string()]).optional(),
  index: z.number().optional(),
  note: z.string().optional(),
});

export const LinearStructureSchema = z.object({
  title: z.string().optional(),
  kind: z.enum(["array", "stack", "queue", "deque", "linked-list"]),
  initial: z.array(z.union([z.number(), z.string()])),
  operations: z.array(LinearOpSchema),
  showIndices: z.boolean().optional(),
  showHeadTail: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type LinearOp = z.infer<typeof LinearOpSchema>;
export type LinearStructureProps = z.infer<typeof LinearStructureSchema>;

type CellValue = number | string;
```

- [ ] **Step 2.2: Add the reducer that applies operations**

Append to the same file:

```tsx
function applyOp(arr: CellValue[], op: LinearOp): CellValue[] {
  const next = [...arr];
  switch (op.op) {
    case "push":
    case "push-back":
    case "enqueue":
      if (op.value !== undefined) next.push(op.value);
      break;
    case "push-front":
      if (op.value !== undefined) next.unshift(op.value);
      break;
    case "pop":
    case "pop-back":
      next.pop();
      break;
    case "dequeue":
    case "pop-front":
      next.shift();
      break;
    case "insert-at":
      if (typeof op.index === "number" && op.value !== undefined)
        next.splice(op.index, 0, op.value);
      break;
    case "delete-at":
      if (typeof op.index === "number") next.splice(op.index, 1);
      break;
    case "read":
      break;
  }
  return next;
}

function reduceUpTo(initial: CellValue[], ops: LinearOp[], k: number): CellValue[] {
  let arr = initial;
  for (let i = 0; i < k; i++) arr = applyOp(arr, ops[i]);
  return arr;
}
```

- [ ] **Step 2.3: Implement the component**

Append to the same file:

```tsx
export const LinearStructure: React.FC<LinearStructureProps> = ({
  title, kind, initial, operations,
  showIndices = true, showHeadTail = true,
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentStepIdx = Math.min(operations.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(currentStepIdx, { stepFrames, frame, fps });

  const before = reduceUpTo(initial, operations, currentStepIdx);
  const current = operations[currentStepIdx];
  const isVerticalStack = kind === "stack";
  const cellW = 90, cellH = 60, gap = 8;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Determine the "after" array for this step (for visualising insertions).
  const after = applyOp(before, current);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
    }}>
      {title && (
        <h2 style={{
          fontSize: 48, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: isVerticalStack ? "column-reverse" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap,
        position: "relative",
      }}>
        {renderCells({
          before, after, current, progress,
          kind, accent, theme, cellW, cellH, gap,
          showIndices, showHeadTail,
        })}
      </div>

      {current?.note && (
        <div style={{
          textAlign: "center", color: "#94a3b8", fontSize: 18,
          opacity: interpolate(progress, [0, 0.15], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>{current.note}</div>
      )}
    </div>
  );
};
```

- [ ] **Step 2.4: Implement the cell renderer**

Append `renderCells` to the same file. This is the heart of the component — it handles push / pop / insert-at / delete-at motion:

```tsx
function renderCells(args: {
  before: CellValue[]; after: CellValue[]; current: LinearOp; progress: number;
  kind: LinearStructureProps["kind"]; accent: string; theme: ReturnType<typeof useTheme>;
  cellW: number; cellH: number; gap: number;
  showIndices: boolean; showHeadTail: boolean;
}) {
  const { before, after, current, progress, kind, accent, theme, cellW, cellH, showIndices, showHeadTail } = args;

  // Compute display array & per-cell transform based on the op
  const cells: {
    value: CellValue; opacity: number;
    dx: number; dy: number; scale: number;
    highlight: boolean; ghost?: boolean;
  }[] = [];

  const isInsertion =
    current.op === "push" || current.op === "push-back" ||
    current.op === "push-front" || current.op === "enqueue" ||
    current.op === "insert-at";

  const isRemoval =
    current.op === "pop" || current.op === "pop-back" ||
    current.op === "pop-front" || current.op === "dequeue" ||
    current.op === "delete-at";

  if (isInsertion) {
    // `after` has one more cell than `before`. Find the insert index.
    const insertIdx =
      current.op === "push" || current.op === "push-back" || current.op === "enqueue"
        ? before.length
        : current.op === "push-front"
        ? 0
        : (current.index ?? 0);
    for (let i = 0; i < after.length; i++) {
      const v = after[i];
      const isNew = i === insertIdx;
      if (isNew) {
        cells.push({
          value: v,
          opacity: interpolate(progress, [0.1, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          dx: 0, dy: kind === "stack" ? interpolate(progress, [0, 1], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
          scale: interpolate(progress, [0, 1], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          highlight: true,
        });
      } else {
        // Shift cells at/after insertIdx to make room, animated.
        const shifted = i > insertIdx;
        const dx = shifted ? interpolate(progress, [0, 1], [-(cellW + args.gap), 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
        cells.push({ value: v, opacity: 1, dx: kind === "stack" ? 0 : dx, dy: 0, scale: 1, highlight: false });
      }
    }
  } else if (isRemoval) {
    // Show `before` with the removed cell fading/scaling out.
    const removeIdx =
      current.op === "pop" || current.op === "pop-back"
        ? before.length - 1
        : current.op === "pop-front" || current.op === "dequeue"
        ? 0
        : (current.index ?? 0);
    for (let i = 0; i < before.length; i++) {
      const v = before[i];
      if (i === removeIdx) {
        cells.push({
          value: v,
          opacity: interpolate(progress, [0, 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          dx: 0, dy: kind === "stack" ? interpolate(progress, [0, 1], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
          scale: interpolate(progress, [0, 1], [1, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          highlight: true,
        });
      } else {
        const shifted = i > removeIdx;
        const dx = shifted && kind !== "stack"
          ? interpolate(progress, [0.4, 1], [0, -(cellW + args.gap)], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 0;
        cells.push({ value: v, opacity: 1, dx, dy: 0, scale: 1, highlight: false });
      }
    }
  } else if (current.op === "read") {
    for (let i = 0; i < before.length; i++) {
      cells.push({
        value: before[i], opacity: 1, dx: 0, dy: 0, scale: 1,
        highlight: i === (current.index ?? -1),
      });
    }
  } else {
    for (const v of before) cells.push({ value: v, opacity: 1, dx: 0, dy: 0, scale: 1, highlight: false });
  }

  return (
    <>
      {cells.map((c, i) => (
        <div key={i} style={{
          width: cellW, height: cellH,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: c.highlight ? mix("#1e293b", accent, 0.7) : "#1e293b",
          border: `2px solid ${c.highlight ? accent : "#334155"}`,
          borderRadius: kind === "linked-list" ? 20 : 8,
          color: "#f1f5f9", fontSize: 24, fontWeight: 700,
          opacity: c.opacity,
          translate: `${c.dx}px ${c.dy}px`,
          scale: c.scale,
          boxShadow: c.highlight ? `0 0 20px ${accent}70` : undefined,
          position: "relative",
        }}>
          {c.value}
          {kind === "linked-list" && i < cells.length - 1 && (
            <span style={{
              position: "absolute", right: -30, top: "50%", translate: "0 -50%",
              color: "#64748b", fontSize: 28,
            }}>→</span>
          )}
          {showIndices && kind !== "linked-list" && kind !== "stack" && (
            <span style={{
              position: "absolute", bottom: -28, color: "#64748b", fontSize: 14,
            }}>{i}</span>
          )}
          {showHeadTail && kind !== "array" && kind !== "stack" && (
            <>
              {i === 0 && <span style={{ position: "absolute", top: -28, color: accent, fontSize: 14, fontWeight: 700 }}>HEAD</span>}
              {i === cells.length - 1 && <span style={{ position: "absolute", top: -28, right: 0, color: theme.primary, fontSize: 14, fontWeight: 700 }}>TAIL</span>}
            </>
          )}
          {kind === "stack" && i === cells.length - 1 && (
            <span style={{ position: "absolute", right: -60, color: accent, fontSize: 14, fontWeight: 700 }}>TOP →</span>
          )}
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 2.5: Wire into registry**

Edit `frontend/src/registry.ts`:

```ts
import { LinearStructure, LinearStructureSchema } from "./components/LinearStructure";
```

Add entries in each of the four blocks:

```ts
// COMPONENT_REGISTRY
LinearStructure,

// COMPONENT_SCHEMAS
LinearStructure: LinearStructureSchema,

// COMPONENT_META
LinearStructure: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["panel", "main"],
  useWhen: "a linear data structure — array, stack, queue, deque, or linked list — being mutated by a sequence of operations",
  tags: ["array", "stack", "queue", "deque", "linked-list", "data-structure", "push", "pop"],
  minSeconds: 8,
},

// COMPONENT_CATALOG
LinearStructure: {
  description: "An animated linear data structure — array, stack, queue, deque, or linked list — with push/pop/enqueue/dequeue/insert/delete motion. Cells shift, fade, and translate to visualise each operation.",
  schema: toJsonSchema(LinearStructureSchema, "LinearStructureProps"),
},
```

- [ ] **Step 2.6: Add preview composition**

Edit `frontend/src/Root.tsx`:

```tsx
import { LinearStructure } from "./components/LinearStructure";
```

Add a `<Composition>` next to the previous preview:

```tsx
<Composition
  id="preview-LinearStructure"
  component={LinearStructure}
  durationInFrames={30 * 12}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "Queue: enqueue / dequeue",
    kind: "queue" as const,
    initial: [1, 2, 3],
    operations: [
      { op: "enqueue" as const, value: 4 },
      { op: "enqueue" as const, value: 5 },
      { op: "dequeue" as const },
      { op: "dequeue" as const },
    ],
    showHeadTail: true,
  }}
/>
```

- [ ] **Step 2.7: Visual verification**

Run: `cd frontend && npx remotion studio`
Select `preview-LinearStructure`. Verify:
- Cells `[1, 2, 3]` appear.
- `enqueue 4` fades in a new tail cell from the right; HEAD/TAIL labels track correctly.
- `enqueue 5` appends another.
- `dequeue` slides the head cell out left; the rest shift left.

- [ ] **Step 2.8: Commit**

```bash
git add frontend/src/components/LinearStructure.tsx \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add LinearStructure component"
```

---

## Task 3: `ArrayAlgorithm`

**Files:**
- Create: `frontend/src/components/ArrayAlgorithm.tsx`
- Create: `frontend/src/components/ArrayAlgorithm.steps.ts`
- Modify: `frontend/src/registry.ts`
- Modify: `frontend/src/Root.tsx`

**Interfaces:**
- Consumes: `mix`, `stepAt`, `resolveSteps` from `_shared/anim`.
- Produces:
  - `ArrayAlgorithmSchema`, `ArrayAlgorithmProps`
  - `ArrayAlgorithm: React.FC<ArrayAlgorithmProps>`
  - `generateArrayAlgorithmSteps(mode, values, target?, windowSize?): ArrayStep[]`
  - `type ArrayStep = { pointers: Record<string, number>; windowSum?: number; note?: string; result?: "found" | "narrow-left" | "narrow-right" | "expand" | "shrink" | "advance" }`

- [ ] **Step 3.1: Schema + types**

Create `frontend/src/components/ArrayAlgorithm.tsx`:

```tsx
import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps } from "./_shared/anim";
import { generateArrayAlgorithmSteps } from "./ArrayAlgorithm.steps";

export const ArrayStepSchema = z.object({
  pointers: z.record(z.string(), z.number()),
  windowSum: z.number().optional(),
  note: z.string().optional(),
  result: z.enum([
    "found", "narrow-left", "narrow-right",
    "expand", "shrink", "advance",
  ]).optional(),
});

export const ArrayAlgorithmSchema = z.object({
  title: z.string().optional(),
  mode: z.enum(["binary-search", "sliding-window", "two-pointer"]),
  values: z.array(z.union([z.number(), z.string()])),
  target: z.union([z.number(), z.string()]).optional(),
  windowSize: z.number().optional(),
  steps: z.array(ArrayStepSchema).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type ArrayStep = z.infer<typeof ArrayStepSchema>;
export type ArrayAlgorithmProps = z.infer<typeof ArrayAlgorithmSchema>;
```

- [ ] **Step 3.2: Step generators**

Create `frontend/src/components/ArrayAlgorithm.steps.ts`:

```ts
import type { ArrayStep } from "./ArrayAlgorithm";

type Mode = "binary-search" | "sliding-window" | "two-pointer";

export function generateArrayAlgorithmSteps(
  mode: Mode,
  values: (number | string)[],
  target?: number | string,
  windowSize?: number,
): ArrayStep[] {
  switch (mode) {
    case "binary-search":
      return binarySearch(values as number[], target as number);
    case "sliding-window":
      return slidingWindow(values as number[], windowSize ?? 3);
    case "two-pointer":
      return twoPointer(values as number[], target as number);
  }
}

function binarySearch(arr: number[], target: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  let L = 0, R = arr.length - 1;
  while (L <= R) {
    const M = Math.floor((L + R) / 2);
    steps.push({ pointers: { L, M, R }, note: `arr[${M}]=${arr[M]}` });
    if (arr[M] === target) {
      steps.push({ pointers: { L, M, R }, result: "found", note: `found ${target}` });
      return steps;
    }
    if (arr[M] < target) {
      L = M + 1;
      steps.push({ pointers: { L, M: Math.floor((L + R) / 2), R }, result: "narrow-right" });
    } else {
      R = M - 1;
      steps.push({ pointers: { L, M: Math.floor((L + R) / 2), R }, result: "narrow-left" });
    }
  }
  return steps;
}

function slidingWindow(arr: number[], k: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  if (arr.length < k) return steps;
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i];
  steps.push({ pointers: { start: 0, end: k - 1 }, windowSum: sum, result: "expand" });
  for (let end = k; end < arr.length; end++) {
    sum += arr[end] - arr[end - k];
    steps.push({
      pointers: { start: end - k + 1, end },
      windowSum: sum,
      result: "advance",
    });
  }
  return steps;
}

function twoPointer(arr: number[], target: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  let i = 0, j = arr.length - 1;
  while (i < j) {
    const sum = arr[i] + arr[j];
    steps.push({ pointers: { i, j }, note: `${arr[i]} + ${arr[j]} = ${sum}` });
    if (sum === target) {
      steps.push({ pointers: { i, j }, result: "found" });
      return steps;
    }
    if (sum < target) { i++; steps.push({ pointers: { i, j }, result: "advance" }); }
    else { j--; steps.push({ pointers: { i, j }, result: "advance" }); }
  }
  return steps;
}
```

- [ ] **Step 3.3: Component render**

Append to `ArrayAlgorithm.tsx`:

```tsx
export const ArrayAlgorithm: React.FC<ArrayAlgorithmProps> = ({
  title, mode, values, target, windowSize,
  steps: explicitSteps, speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateArrayAlgorithmSteps(mode, values, target, windowSize)
  );
  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentIdx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(currentIdx, { stepFrames, frame, fps });

  const current = steps[currentIdx];
  const prev = steps[Math.max(0, currentIdx - 1)];
  const cellW = 80, gap = 10;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Interpolated pointer positions (in cell-index space)
  const pointerNames = Object.keys(current?.pointers ?? {});
  const pointerPositions: Record<string, number> = {};
  for (const name of pointerNames) {
    const prevPos = prev?.pointers[name] ?? current.pointers[name];
    const nowPos = current.pointers[name];
    pointerPositions[name] = interpolate(progress, [0, 1], [prevPos, nowPos], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }

  // For binary-search: excluded region opacity
  const isBinary = mode === "binary-search";
  const L = current.pointers.L, R = current.pointers.R;

  // Sliding-window box
  const wStart = pointerPositions.start;
  const wEnd = pointerPositions.end;

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      position: "relative",
    }}>
      {title && (
        <h2 style={{
          fontSize: 48, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", gap: 40, position: "relative",
      }}>
        {/* Sliding-window overlay */}
        {mode === "sliding-window" && wStart !== undefined && wEnd !== undefined && (
          <div style={{
            position: "absolute",
            left: `calc(50% + ${(wStart - values.length / 2) * (cellW + gap)}px)`,
            width: (wEnd - wStart + 1) * (cellW + gap) - gap,
            height: cellW + 40,
            top: `calc(50% - ${(cellW + 40) / 2}px)`,
            border: `3px solid ${accent}`,
            borderRadius: 12,
            background: `${accent}20`,
            boxShadow: `0 0 30px ${accent}50`,
          }} />
        )}

        {/* Cells */}
        <div style={{ display: "flex", gap, position: "relative", zIndex: 2 }}>
          {values.map((v, i) => {
            const excluded = isBinary && (i < L || i > R);
            const isFound = current.result === "found" && (
              (mode === "binary-search" && i === current.pointers.M) ||
              (mode === "two-pointer" && (i === current.pointers.i || i === current.pointers.j))
            );
            return (
              <div key={i} style={{
                width: cellW, height: cellW,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isFound ? mix("#1e293b", accent, 0.8) : "#1e293b",
                border: `2px solid ${isFound ? accent : "#334155"}`,
                borderRadius: 8,
                color: "#f1f5f9", fontSize: 28, fontWeight: 700,
                opacity: excluded ? interpolate(progress, [0, 1], [1, 0.3], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                }) : 1,
                boxShadow: isFound ? `0 0 30px ${accent}80` : undefined,
                position: "relative",
              }}>
                {v}
                <span style={{
                  position: "absolute", bottom: -26, color: "#64748b", fontSize: 14,
                }}>{i}</span>
              </div>
            );
          })}
        </div>

        {/* Pointer markers */}
        <div style={{
          position: "relative", width: values.length * (cellW + gap) - gap, height: 60,
          marginTop: 30,
        }}>
          {Object.entries(pointerPositions).map(([name, pos]) => (
            <div key={name} style={{
              position: "absolute",
              left: pos * (cellW + gap) + cellW / 2 - 20,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: name === "M" || name === "start" ? theme.primary : accent,
            }}>
              <span style={{ fontSize: 24 }}>▲</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Running window sum */}
        {mode === "sliding-window" && typeof current.windowSum === "number" && (
          <div style={{
            fontSize: 28, fontWeight: 800, color: accent,
            textShadow: `0 0 20px ${accent}80`,
          }}>
            sum = {current.windowSum}
          </div>
        )}

        {current.note && (
          <div style={{ color: "#94a3b8", fontSize: 20 }}>{current.note}</div>
        )}
      </div>

      {typeof target !== "undefined" && (
        <div style={{
          position: "absolute", top: 60, right: 80,
          color: "#f1f5f9", fontSize: 20,
        }}>target: <strong style={{ color: accent }}>{target}</strong></div>
      )}
    </div>
  );
};
```

- [ ] **Step 3.4: Wire into registry**

Edit `frontend/src/registry.ts`:

```ts
import { ArrayAlgorithm, ArrayAlgorithmSchema } from "./components/ArrayAlgorithm";
```

Entries:

```ts
// COMPONENT_REGISTRY
ArrayAlgorithm,

// COMPONENT_SCHEMAS
ArrayAlgorithm: ArrayAlgorithmSchema,

// COMPONENT_META
ArrayAlgorithm: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["main", "panel"],
  useWhen: "an array-scan algorithm — binary search, sliding window, or two-pointer technique",
  tags: ["array", "pointer", "binary-search", "sliding-window", "two-pointer"],
  minSeconds: 8,
},

// COMPONENT_CATALOG
ArrayAlgorithm: {
  description: "An animated array walkthrough with pointer overlays. Modes: binary-search (L/M/R), sliding-window (start/end + running sum), two-pointer (i/j).",
  schema: toJsonSchema(ArrayAlgorithmSchema, "ArrayAlgorithmProps"),
},
```

- [ ] **Step 3.5: Preview composition**

Edit `frontend/src/Root.tsx`:

```tsx
import { ArrayAlgorithm } from "./components/ArrayAlgorithm";
```

```tsx
<Composition
  id="preview-ArrayAlgorithm"
  component={ArrayAlgorithm}
  durationInFrames={30 * 10}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "Binary search for 23",
    mode: "binary-search" as const,
    values: [3, 7, 11, 15, 19, 23, 27, 31, 35],
    target: 23,
  }}
/>
```

- [ ] **Step 3.6: Visual verification**

Run Studio. Select `preview-ArrayAlgorithm`. Verify:
- Nine cells appear.
- `L`, `M`, `R` pointers appear below.
- Each step, `M` moves; excluded halves fade to 30%.
- On found step, cell at `23` pulses accent.

Also change `defaultProps` briefly to `mode: "sliding-window"` and to `"two-pointer"` to visually check both — revert after.

- [ ] **Step 3.7: Commit**

```bash
git add frontend/src/components/ArrayAlgorithm.tsx \
        frontend/src/components/ArrayAlgorithm.steps.ts \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add ArrayAlgorithm component"
```

---

## Task 4: `DPTableVisualizer`

**Files:**
- Create: `frontend/src/components/DPTableVisualizer.tsx`
- Modify: `frontend/src/registry.ts`
- Modify: `frontend/src/Root.tsx`

**Interfaces:**
- Consumes: `mix`, `stepAt` from `_shared/anim`.
- Produces:
  - `DPTableVisualizerSchema`, `DPTableVisualizerProps`
  - `DPTableVisualizer: React.FC<DPTableVisualizerProps>`

No generator — `fills` are supplied by the planner or scene author.

- [ ] **Step 4.1: Component file with schema**

Create `frontend/src/components/DPTableVisualizer.tsx`:

```tsx
import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing, spring,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";

const CoordSchema = z.object({ row: z.number(), col: z.number() });

export const DPFillSchema = z.object({
  row: z.number(),
  col: z.number(),
  value: z.union([z.string(), z.number()]),
  dependsOn: z.array(CoordSchema).optional(),
  note: z.string().optional(),
});

export const DPTableVisualizerSchema = z.object({
  title: z.string().optional(),
  rows: z.number(),
  cols: z.number(),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  fills: z.array(DPFillSchema),
  highlightPath: z.array(CoordSchema).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type DPFill = z.infer<typeof DPFillSchema>;
export type DPTableVisualizerProps = z.infer<typeof DPTableVisualizerSchema>;
```

- [ ] **Step 4.2: Component render**

Append to the same file:

```tsx
export const DPTableVisualizer: React.FC<DPTableVisualizerProps> = ({
  title, rows, cols, rowLabels, colLabels,
  fills, highlightPath = [],
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const gridDrawFrames = 12;
  const fillsStartFrame = gridDrawFrames + 6;
  const totalFillFrames = fills.length * stepFrames;
  const pathStartFrame = fillsStartFrame + totalFillFrames + stepFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Grid entrance
  const gridProgress = interpolate(frame, [0, gridDrawFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Which fills have started?
  const currentFillIdx = Math.max(-1, Math.min(fills.length - 1,
    Math.floor((frame - fillsStartFrame) / stepFrames)));
  const currentFillProgress = frame >= fillsStartFrame
    ? stepAt(currentFillIdx, { stepFrames, frame: frame - fillsStartFrame, fps }).progress
    : 0;

  // Path highlight sequencing
  const pathIdx = Math.max(-1, Math.min(highlightPath.length - 1,
    Math.floor((frame - pathStartFrame) / (stepFrames / 2))));

  const cellSize = Math.min(100, Math.floor(800 / Math.max(rows, cols)));
  const gap = 4;

  // Build a fast lookup of "was this cell filled at step k?" and its value.
  const cellState: Map<string, { value: string | number; filledAt: number }> = new Map();
  fills.forEach((f, i) => {
    if (i <= currentFillIdx) cellState.set(`${f.row},${f.col}`, { value: f.value, filledAt: i });
  });

  const current = currentFillIdx >= 0 ? fills[currentFillIdx] : undefined;
  const depSet = new Set((current?.dependsOn ?? []).map(d => `${d.row},${d.col}`));
  const pathSet = new Set(highlightPath.slice(0, pathIdx + 1).map(p => `${p.row},${p.col}`));

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 24,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {colLabels && (
            <div style={{ display: "flex", gap, marginLeft: rowLabels ? cellSize + gap : 0 }}>
              {colLabels.slice(0, cols).map((l, c) => (
                <div key={c} style={{
                  width: cellSize, textAlign: "center",
                  color: "#94a3b8", fontSize: 16, fontWeight: 700,
                }}>{l}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {rowLabels && (
              <div style={{ display: "flex", flexDirection: "column", gap }}>
                {rowLabels.slice(0, rows).map((l, r) => (
                  <div key={r} style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#94a3b8", fontSize: 16, fontWeight: 700,
                  }}>{l}</div>
                ))}
              </div>
            )}
            <div style={{ display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap,
              transformOrigin: "top left",
              scale: interpolate(gridProgress, [0, 1], [0.95, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
              opacity: gridProgress,
            }}>
              {Array.from({ length: rows * cols }, (_, idx) => {
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                const key = `${r},${c}`;
                const state = cellState.get(key);
                const isCurrent = current?.row === r && current?.col === c;
                const isDep = depSet.has(key);
                const inPath = pathSet.has(key);

                let bg = "#1e293b";
                let border = "#334155";
                if (state) bg = mix("#1e293b", theme.secondary, 0.35);
                if (isDep) { bg = mix(bg, theme.primary, 0.5); border = theme.primary; }
                if (isCurrent) {
                  const p = currentFillProgress;
                  bg = mix(bg, accent, Math.min(1, p * 2));
                  border = accent;
                }
                if (inPath) { bg = mix(bg, accent, 0.7); border = accent; }

                const scale = isCurrent
                  ? interpolate(currentFillProgress, [0, 1], [0.6, 1], {
                      extrapolateLeft: "clamp", extrapolateRight: "clamp",
                    })
                  : 1;

                const displayValue = state?.value ?? "";
                const showValue = state
                  ? isCurrent
                    ? interpolate(currentFillProgress, [0.4, 1], [0, 1], {
                        extrapolateLeft: "clamp", extrapolateRight: "clamp",
                      })
                    : 1
                  : 0;

                return (
                  <div key={key} style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: 6,
                    color: "#f1f5f9", fontSize: 22, fontWeight: 700,
                    scale,
                    boxShadow: isCurrent ? `0 0 20px ${accent}70` : undefined,
                  }}>
                    <span style={{ opacity: showValue }}>{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {current?.note && (
            <div style={{
              marginTop: 20, color: "#94a3b8", fontSize: 18,
              opacity: interpolate(currentFillProgress, [0, 0.3], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}>{current.note}</div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4.3: Wire into registry**

Edit `frontend/src/registry.ts`:

```ts
import { DPTableVisualizer, DPTableVisualizerSchema } from "./components/DPTableVisualizer";
```

Entries:

```ts
// COMPONENT_REGISTRY
DPTableVisualizer,

// COMPONENT_SCHEMAS
DPTableVisualizer: DPTableVisualizerSchema,

// COMPONENT_META
DPTableVisualizer: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["main", "panel"],
  useWhen: "a 2D DP table being filled cell-by-cell, or a matrix-based algorithm (LCS, edit distance, Floyd-Warshall, knapsack)",
  tags: ["dp", "dynamic-programming", "matrix", "table", "memoization", "subproblems"],
  minSeconds: 12,
},

// COMPONENT_CATALOG
DPTableVisualizer: {
  description: "An animated 2D DP table. Cells fill in order with dependency arrows from prior cells; optional final path traces the optimal answer.",
  schema: toJsonSchema(DPTableVisualizerSchema, "DPTableVisualizerProps"),
},
```

- [ ] **Step 4.4: Preview composition**

Edit `frontend/src/Root.tsx`:

```tsx
import { DPTableVisualizer } from "./components/DPTableVisualizer";
```

```tsx
<Composition
  id="preview-DPTableVisualizer"
  component={DPTableVisualizer}
  durationInFrames={30 * 15}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "Fibonacci DP table",
    rows: 1,
    cols: 8,
    colLabels: ["0", "1", "2", "3", "4", "5", "6", "7"],
    fills: [
      { row: 0, col: 0, value: 0 },
      { row: 0, col: 1, value: 1 },
      { row: 0, col: 2, value: 1, dependsOn: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      { row: 0, col: 3, value: 2, dependsOn: [{ row: 0, col: 1 }, { row: 0, col: 2 }] },
      { row: 0, col: 4, value: 3, dependsOn: [{ row: 0, col: 2 }, { row: 0, col: 3 }] },
      { row: 0, col: 5, value: 5, dependsOn: [{ row: 0, col: 3 }, { row: 0, col: 4 }] },
      { row: 0, col: 6, value: 8, dependsOn: [{ row: 0, col: 4 }, { row: 0, col: 5 }] },
      { row: 0, col: 7, value: 13, dependsOn: [{ row: 0, col: 5 }, { row: 0, col: 6 }] },
    ],
  }}
/>
```

- [ ] **Step 4.5: Visual verification**

Run Studio. Select `preview-DPTableVisualizer`. Verify:
- Empty 1×8 grid scales in.
- Each cell fills in order; the two `dependsOn` cells briefly tint `primary` before the current cell scales+writes.
- Final values match the Fibonacci sequence.

- [ ] **Step 4.6: Commit**

```bash
git add frontend/src/components/DPTableVisualizer.tsx \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add DPTableVisualizer component"
```

---

## Task 5: `GraphTraversal`

**Files:**
- Create: `frontend/src/components/GraphTraversal.tsx`
- Create: `frontend/src/components/GraphTraversal.steps.ts`
- Modify: `frontend/src/registry.ts`
- Modify: `frontend/src/Root.tsx`

**Interfaces:**
- Consumes: `mix`, `stepAt`, `resolveSteps` from `_shared/anim`.
- Produces:
  - `GraphTraversalSchema`, `GraphTraversalProps`
  - `GraphTraversal: React.FC<GraphTraversalProps>`
  - `generateGraphSteps(algorithm, nodes, edges, start?): GraphStep[]`

This is the largest task. Broken into more steps than the others.

- [ ] **Step 5.1: Schema + types**

Create `frontend/src/components/GraphTraversal.tsx`:

```tsx
import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps } from "./_shared/anim";
import { generateGraphSteps } from "./GraphTraversal.steps";

const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  x: z.number(),
  y: z.number(),
});

const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
});

export const GraphStepSchema = z.object({
  kind: z.enum([
    "visit", "enqueue", "relax", "settle",
    "mst-select", "mst-reject", "topo-emit",
  ]),
  node: z.string().optional(),
  edge: z.object({ from: z.string(), to: z.string() }).optional(),
  distance: z.number().optional(),
  note: z.string().optional(),
});

export const GraphTraversalSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum([
    "dfs", "bfs", "dijkstra", "bellman-ford",
    "topo-sort", "mst-prim", "mst-kruskal",
  ]),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  start: z.string().optional(),
  steps: z.array(GraphStepSchema).optional(),
  showDistanceTable: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type GraphStep = z.infer<typeof GraphStepSchema>;
export type GraphTraversalProps = z.infer<typeof GraphTraversalSchema>;
```

- [ ] **Step 5.2: Step generators — DFS + BFS**

Create `frontend/src/components/GraphTraversal.steps.ts`:

```ts
import type { GraphStep } from "./GraphTraversal";

type NodeId = string;
type Edge = { from: NodeId; to: NodeId; weight?: number; directed?: boolean };

function neighbors(edges: Edge[], node: NodeId): { to: NodeId; weight: number }[] {
  const out: { to: NodeId; weight: number }[] = [];
  for (const e of edges) {
    if (e.from === node) out.push({ to: e.to, weight: e.weight ?? 1 });
    if (!e.directed && e.to === node) out.push({ to: e.from, weight: e.weight ?? 1 });
  }
  return out;
}

function dfsSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<NodeId>();
  function go(u: NodeId) {
    visited.add(u);
    steps.push({ kind: "visit", node: u });
    for (const { to } of neighbors(edges, u)) {
      if (!visited.has(to)) {
        steps.push({ kind: "enqueue", edge: { from: u, to } });
        go(to);
      }
    }
  }
  go(start);
  return steps;
}

function bfsSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<NodeId>([start]);
  const queue: NodeId[] = [start];
  steps.push({ kind: "visit", node: start });
  while (queue.length) {
    const u = queue.shift()!;
    for (const { to } of neighbors(edges, u)) {
      if (!visited.has(to)) {
        visited.add(to);
        steps.push({ kind: "enqueue", edge: { from: u, to } });
        steps.push({ kind: "visit", node: to });
        queue.push(to);
      }
    }
  }
  return steps;
}

export function generateGraphSteps(
  algorithm: string,
  nodes: { id: NodeId }[],
  edges: Edge[],
  start?: NodeId,
): GraphStep[] {
  const s = start ?? nodes[0]?.id;
  if (!s) return [];
  switch (algorithm) {
    case "dfs": return dfsSteps(nodes, edges, s);
    case "bfs": return bfsSteps(nodes, edges, s);
    case "dijkstra": return dijkstraSteps(nodes, edges, s);
    case "bellman-ford": return bellmanFordSteps(nodes, edges, s);
    case "topo-sort": return topoSteps(nodes, edges);
    case "mst-prim": return primSteps(nodes, edges, s);
    case "mst-kruskal": return kruskalSteps(nodes, edges);
    default: return [];
  }
}
```

- [ ] **Step 5.3: Step generators — Dijkstra + Bellman-Ford**

Append to `GraphTraversal.steps.ts`:

```ts
function dijkstraSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const dist = new Map<NodeId, number>();
  const settled = new Set<NodeId>();
  for (const n of nodes) dist.set(n.id, Infinity);
  dist.set(start, 0);
  steps.push({ kind: "visit", node: start, distance: 0 });

  while (settled.size < nodes.length) {
    let u: NodeId | null = null;
    let best = Infinity;
    for (const n of nodes) {
      const d = dist.get(n.id)!;
      if (!settled.has(n.id) && d < best) { best = d; u = n.id; }
    }
    if (u === null) break;
    settled.add(u);
    steps.push({ kind: "settle", node: u, distance: best });
    for (const { to, weight } of neighbors(edges, u)) {
      const nd = best + weight;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        steps.push({ kind: "relax", edge: { from: u, to }, node: to, distance: nd });
      }
    }
  }
  return steps;
}

function bellmanFordSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const dist = new Map<NodeId, number>();
  for (const n of nodes) dist.set(n.id, Infinity);
  dist.set(start, 0);
  steps.push({ kind: "visit", node: start, distance: 0 });
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of edges) {
      const du = dist.get(e.from) ?? Infinity;
      const w = e.weight ?? 1;
      const nd = du + w;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        steps.push({ kind: "relax", edge: { from: e.from, to: e.to }, node: e.to, distance: nd });
      }
    }
  }
  return steps;
}
```

- [ ] **Step 5.4: Step generators — topological sort, MST (Prim, Kruskal)**

Append to `GraphTraversal.steps.ts`:

```ts
function topoSteps(nodes: { id: NodeId }[], edges: Edge[]): GraphStep[] {
  const steps: GraphStep[] = [];
  const indeg = new Map<NodeId, number>();
  for (const n of nodes) indeg.set(n.id, 0);
  for (const e of edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue: NodeId[] = [];
  for (const n of nodes) if (indeg.get(n.id) === 0) queue.push(n.id);
  while (queue.length) {
    const u = queue.shift()!;
    steps.push({ kind: "topo-emit", node: u });
    for (const e of edges) if (e.from === u) {
      const nd = (indeg.get(e.to) ?? 0) - 1;
      indeg.set(e.to, nd);
      if (nd === 0) queue.push(e.to);
    }
  }
  return steps;
}

function primSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const inTree = new Set<NodeId>([start]);
  steps.push({ kind: "visit", node: start });
  while (inTree.size < nodes.length) {
    let best: { e: Edge; from: NodeId; to: NodeId } | null = null;
    for (const e of edges) {
      const w = e.weight ?? 1;
      const inFrom = inTree.has(e.from), inTo = inTree.has(e.to);
      const usable = (inFrom && !inTo) || (!e.directed && !inFrom && inTo);
      if (usable && (best === null || w < (best.e.weight ?? 1))) {
        const from = inFrom ? e.from : e.to;
        const to = inFrom ? e.to : e.from;
        best = { e, from, to };
      }
    }
    if (!best) break;
    steps.push({ kind: "mst-select", edge: { from: best.from, to: best.to } });
    inTree.add(best.to);
  }
  return steps;
}

// Union-Find for Kruskal
function makeDsu(ids: NodeId[]) {
  const parent = new Map<NodeId, NodeId>();
  for (const id of ids) parent.set(id, id);
  function find(x: NodeId): NodeId {
    if (parent.get(x) === x) return x;
    const r = find(parent.get(x)!);
    parent.set(x, r);
    return r;
  }
  function union(a: NodeId, b: NodeId): boolean {
    const ra = find(a), rb = find(b);
    if (ra === rb) return false;
    parent.set(ra, rb);
    return true;
  }
  return { find, union };
}

function kruskalSteps(nodes: { id: NodeId }[], edges: Edge[]): GraphStep[] {
  const steps: GraphStep[] = [];
  const sorted = [...edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const dsu = makeDsu(nodes.map(n => n.id));
  for (const e of sorted) {
    if (dsu.union(e.from, e.to)) {
      steps.push({ kind: "mst-select", edge: { from: e.from, to: e.to } });
    } else {
      steps.push({ kind: "mst-reject", edge: { from: e.from, to: e.to } });
    }
  }
  return steps;
}
```

- [ ] **Step 5.5: Component render — nodes, edges, and entrance**

Append to `GraphTraversal.tsx`:

```tsx
export const GraphTraversal: React.FC<GraphTraversalProps> = ({
  title, algorithm, nodes, edges, start,
  steps: explicitSteps, showDistanceTable, speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateGraphSteps(algorithm, nodes, edges, start)
  );
  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const entranceFrames = 24;
  const stepsStartFrame = entranceFrames + 6;
  const currentIdx = Math.max(-1, Math.min(steps.length - 1,
    Math.floor((frame - stepsStartFrame) / stepFrames)));
  const stepProgress = frame >= stepsStartFrame
    ? stepAt(currentIdx, { stepFrames, frame: frame - stepsStartFrame, fps }).progress
    : 0;

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Aggregate node/edge states from all steps up to and including currentIdx
  const nodeState = new Map<string, "unvisited" | "frontier" | "visited" | "settled" | "topo">();
  const edgeState = new Map<string, "neutral" | "traversed" | "relaxed" | "mst" | "rejected">();
  const distance = new Map<string, number>();
  const topoOrder: string[] = [];

  for (let i = 0; i <= currentIdx; i++) {
    const s = steps[i];
    if (s.kind === "visit" && s.node) nodeState.set(s.node, "visited");
    if (s.kind === "enqueue" && s.edge) {
      const k = `${s.edge.from}-${s.edge.to}`;
      edgeState.set(k, "traversed");
      if (nodeState.get(s.edge.to) !== "visited") nodeState.set(s.edge.to, "frontier");
    }
    if (s.kind === "relax" && s.edge && s.node) {
      edgeState.set(`${s.edge.from}-${s.edge.to}`, "relaxed");
      if (typeof s.distance === "number") distance.set(s.node, s.distance);
      if (nodeState.get(s.node) !== "settled") nodeState.set(s.node, "frontier");
    }
    if (s.kind === "settle" && s.node) {
      nodeState.set(s.node, "settled");
      if (typeof s.distance === "number") distance.set(s.node, s.distance);
    }
    if (s.kind === "mst-select" && s.edge) edgeState.set(`${s.edge.from}-${s.edge.to}`, "mst");
    if (s.kind === "mst-reject" && s.edge) edgeState.set(`${s.edge.from}-${s.edge.to}`, "rejected");
    if (s.kind === "topo-emit" && s.node) { nodeState.set(s.node, "topo"); topoOrder.push(s.node); }
  }

  // Colours
  const nodeColour = (id: string) => {
    const st = nodeState.get(id) ?? "unvisited";
    if (st === "unvisited") return { fill: "#1e293b", border: "#334155" };
    if (st === "frontier") return { fill: mix("#1e293b", theme.primary, 0.6), border: theme.primary };
    if (st === "visited") return { fill: mix("#1e293b", theme.secondary, 0.5), border: theme.secondary };
    if (st === "settled") return { fill: mix("#1e293b", theme.secondary, 0.7), border: theme.secondary };
    return { fill: mix("#1e293b", theme.secondary, 0.6), border: theme.secondary };
  };

  const edgeColour = (from: string, to: string) => {
    const st = edgeState.get(`${from}-${to}`) ?? "neutral";
    if (st === "mst") return { stroke: accent, width: 4 };
    if (st === "rejected") return { stroke: "#ef4444", width: 2 };
    if (st === "relaxed") return { stroke: accent, width: 3 };
    if (st === "traversed") return { stroke: theme.primary, width: 2.5 };
    return { stroke: "#334155", width: 2 };
  };

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      padding: "60px 80px", boxSizing: "border-box",
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <svg width="100%" height="100%" style={{
        position: "absolute", inset: 0, marginTop: 100,
      }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeById.get(e.from), to = nodeById.get(e.to);
          if (!from || !to) return null;
          const { stroke, width } = edgeColour(e.from, e.to);
          const entrance = interpolate(frame, [0, entranceFrames], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const dx = to.x - from.x, dy = to.y - from.y;
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${from.x + dx * entrance}%`}
                y2={`${from.y + dy * entrance}%`}
                stroke={stroke} strokeWidth={width} strokeLinecap="round"
              />
              {typeof e.weight === "number" && (
                <g transform={`translate(${mx}%, ${my}%)`} opacity={entrance}>
                  <rect x={-16} y={-14} width={32} height={22} rx={11}
                    fill="#0f172a" stroke="#334155" strokeWidth={1} />
                  <text textAnchor="middle" dy={4} fill="#e2e8f0" fontSize={14} fontWeight={700}>
                    {e.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const { fill, border } = nodeColour(n.id);
          const enter = interpolate(
            frame, [i * 3, i * 3 + entranceFrames], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const isCurrentTarget = steps[currentIdx]?.node === n.id;
          const pulse = isCurrentTarget
            ? 1 + 0.15 * Math.sin(stepProgress * Math.PI)
            : 1;
          return (
            <g key={n.id}
              transform={`translate(${n.x}%, ${n.y}%)`}
              opacity={enter}
            >
              <circle r={28 * pulse} fill={fill} stroke={border} strokeWidth={3} />
              <text textAnchor="middle" dy={5} fill="#f1f5f9" fontSize={18} fontWeight={800}>
                {n.label ?? n.id}
              </text>
              {distance.has(n.id) && (
                <text textAnchor="middle" dy={50} fill={accent} fontSize={14} fontWeight={700}>
                  d={distance.get(n.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Distance table (right column) */}
      {showDistanceTable && (algorithm === "dijkstra" || algorithm === "bellman-ford") && (
        <div style={{
          position: "absolute", top: 140, right: 80,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 12,
          padding: 20, minWidth: 200,
        }}>
          <h3 style={{ color: "#f1f5f9", fontSize: 18, margin: "0 0 12px 0" }}>Distances</h3>
          {nodes.map(n => (
            <div key={n.id} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: "1px solid #1e293b",
              color: "#f1f5f9", fontSize: 16,
            }}>
              <span>{n.label ?? n.id}</span>
              <strong style={{ color: accent }}>
                {distance.has(n.id) ? distance.get(n.id) : "∞"}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Topological order lane */}
      {algorithm === "topo-sort" && topoOrder.length > 0 && (
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 10,
        }}>
          {topoOrder.map((id, i) => (
            <div key={i} style={{
              padding: "8px 16px", background: theme.secondary,
              color: "#0a0e1a", borderRadius: 8, fontSize: 16, fontWeight: 700,
            }}>{nodeById.get(id)?.label ?? id}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 5.6: Wire into registry**

Edit `frontend/src/registry.ts`:

```ts
import { GraphTraversal, GraphTraversalSchema } from "./components/GraphTraversal";
```

Entries:

```ts
// COMPONENT_REGISTRY
GraphTraversal,

// COMPONENT_SCHEMAS
GraphTraversal: GraphTraversalSchema,

// COMPONENT_META
GraphTraversal: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["main", "panel"],
  useWhen: "a graph algorithm being traced — DFS/BFS traversal, shortest path (Dijkstra/Bellman-Ford), MST, or topological sort",
  tags: ["graph", "traversal", "dfs", "bfs", "dijkstra", "bellman-ford", "shortest-path", "mst", "topological"],
  minSeconds: 12,
},

// COMPONENT_CATALOG
GraphTraversal: {
  description: "An animated graph algorithm walkthrough. Node states (unvisited/frontier/visited/settled) and edge states (traversed/relaxed/MST/rejected) update per step. Supports DFS, BFS, Dijkstra, Bellman-Ford, topological sort, Prim's and Kruskal's MST.",
  schema: toJsonSchema(GraphTraversalSchema, "GraphTraversalProps"),
},
```

- [ ] **Step 5.7: Preview composition**

Edit `frontend/src/Root.tsx`:

```tsx
import { GraphTraversal } from "./components/GraphTraversal";
```

```tsx
<Composition
  id="preview-GraphTraversal"
  component={GraphTraversal}
  durationInFrames={30 * 18}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "Dijkstra from A",
    algorithm: "dijkstra" as const,
    nodes: [
      { id: "A", x: 15, y: 40 },
      { id: "B", x: 40, y: 20 },
      { id: "C", x: 40, y: 65 },
      { id: "D", x: 65, y: 40 },
      { id: "E", x: 85, y: 25 },
      { id: "F", x: 85, y: 60 },
    ],
    edges: [
      { from: "A", to: "B", weight: 4 },
      { from: "A", to: "C", weight: 2 },
      { from: "B", to: "C", weight: 1 },
      { from: "B", to: "D", weight: 5 },
      { from: "C", to: "D", weight: 8 },
      { from: "D", to: "E", weight: 2 },
      { from: "D", to: "F", weight: 6 },
      { from: "E", to: "F", weight: 3 },
    ],
    start: "A",
    showDistanceTable: true,
  }}
/>
```

- [ ] **Step 5.8: Visual verification**

Run Studio. Select `preview-GraphTraversal`. Verify:
- Six nodes fade in with their edges drawing between them; weight pills appear mid-edge.
- Nodes settle progressively; frontier nodes glow `primary`, settled turn `secondary`.
- Relaxed edges sweep `accent`; distances appear below each node.
- Distance table on the right updates as nodes settle.

Also try changing to `algorithm: "bfs"`, `"topo-sort"`, `"mst-kruskal"` to visually check each — revert after.

- [ ] **Step 5.9: Commit**

```bash
git add frontend/src/components/GraphTraversal.tsx \
        frontend/src/components/GraphTraversal.steps.ts \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add GraphTraversal component"
```

---

## Task 6: `RecursionTree`

**Files:**
- Create: `frontend/src/components/RecursionTree.tsx`
- Create: `frontend/src/components/RecursionTree.steps.ts`
- Modify: `frontend/src/registry.ts`
- Modify: `frontend/src/Root.tsx`

**Interfaces:**
- Consumes: `stepAt` from `_shared/anim`.
- Produces:
  - `RecursionTreeSchema`, `RecursionTreeProps`
  - `RecursionTree: React.FC<RecursionTreeProps>`
  - `flattenTree(node): FlatNode[]` — computes DFS visit order + layout coordinates
  - `type FlatNode = { id: string; label: string; depth: number; x: number; y: number; parentId?: string; returns?: string | number; pruned?: boolean; memoized?: boolean }`

- [ ] **Step 6.1: Schema, types, and recursive Zod**

Create `frontend/src/components/RecursionTree.tsx`:

```tsx
import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { flattenTree, type FlatNode } from "./RecursionTree.steps";

export type TreeNode = {
  label: string;
  children?: TreeNode[];
  returns?: string | number;
  pruned?: boolean;
};

const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() => z.object({
  label: z.string(),
  children: z.array(TreeNodeSchema).optional(),
  returns: z.union([z.string(), z.number()]).optional(),
  pruned: z.boolean().optional(),
}));

export const RecursionTreeSchema = z.object({
  title: z.string().optional(),
  root: TreeNodeSchema,
  pruning: z.boolean().optional(),
  showReturns: z.boolean().optional(),
  memoized: z.array(z.string()).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type RecursionTreeProps = z.infer<typeof RecursionTreeSchema>;
```

- [ ] **Step 6.2: Tree layout + DFS order**

Create `frontend/src/components/RecursionTree.steps.ts`:

```ts
import type { TreeNode } from "./RecursionTree";

export type FlatNode = {
  id: string;
  label: string;
  depth: number;
  x: number;     // 0-100 percentage
  y: number;     // 0-100 percentage
  parentId?: string;
  returns?: string | number;
  pruned?: boolean;
  memoized?: boolean;
};

/**
 * DFS pre-order flatten with tidy layout: level = depth, x = leaf order.
 * Memoization: nodes whose `label` appears in `memoized` are treated as
 * memo-hits ONLY on second and subsequent occurrences — the first occurrence
 * computes (and expands) normally. This matches how memoization actually works.
 */
export function flattenTree(
  root: TreeNode,
  memoized?: string[],
): FlatNode[] {
  const memo = new Set(memoized ?? []);
  const seenLabels = new Set<string>();
  const flat: FlatNode[] = [];
  let leafX = 0;
  let maxDepth = 0;

  function walk(
    node: TreeNode,
    depth: number,
    parentId: string | undefined,
    path: string,
  ): FlatNode {
    maxDepth = Math.max(maxDepth, depth);
    const id = path;
    const isMemoHit = memo.has(node.label) && seenLabels.has(node.label);
    seenLabels.add(node.label);
    const stopExpanding = isMemoHit || !!node.pruned;
    const children = stopExpanding ? [] : (node.children ?? []);

    const record: FlatNode = {
      id, label: node.label, depth,
      x: 0, y: 0,           // filled below
      parentId,
      returns: node.returns,
      pruned: node.pruned,
      memoized: isMemoHit,
    };
    flat.push(record);      // pre-order: parent first, then descendants

    if (children.length === 0) {
      record.x = leafX;
      leafX += 1;
    } else {
      const childRecords = children.map((c, i) =>
        walk(c, depth + 1, id, `${path}.${i}`)
      );
      record.x = (childRecords[0].x + childRecords[childRecords.length - 1].x) / 2;
    }
    return record;
  }

  walk(root, 0, undefined, "0");

  // Normalise x to 10-90%, y to 15-85% based on maxDepth.
  const totalLeaves = Math.max(1, leafX);
  const yStep = maxDepth === 0 ? 0 : 70 / maxDepth;
  return flat.map(n => ({
    ...n,
    x: 10 + (n.x / Math.max(1, totalLeaves - 1)) * 80,
    y: 15 + yStep * n.depth,
  }));
}
```

- [ ] **Step 6.3: Component render — growth + edges**

Append to `RecursionTree.tsx`:

```tsx
export const RecursionTree: React.FC<RecursionTreeProps> = ({
  title, root, pruning, showReturns, memoized,
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const flat = React.useMemo(() => flattenTree(root, memoized), [root, memoized]);

  const stepFrames = Math.max(1, Math.round((0.6 / speed) * fps));
  const growPhaseFrames = flat.length * stepFrames;
  const returnPhaseStart = growPhaseFrames + stepFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const nodeById = new Map(flat.map(n => [n.id, n]));

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      padding: "60px 80px", boxSizing: "border-box",
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, marginTop: 60 }}>
        {/* Edges (drawn before their child appears) */}
        {flat.map((n, i) => {
          if (!n.parentId) return null;
          const p = nodeById.get(n.parentId);
          if (!p) return null;
          const startAt = i * stepFrames;
          const edgeProgress = interpolate(
            frame, [startAt, startAt + Math.round(stepFrames * 0.4)], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic) }
          );
          const dimmed = pruning && n.pruned;
          const path = `M ${p.x}% ${p.y + 3}% Q ${p.x}% ${(p.y + n.y) / 2}% ${p.x + (n.x - p.x) * edgeProgress}% ${p.y + (n.y - p.y) * edgeProgress}%`;
          return (
            <path
              key={n.id}
              d={path}
              stroke={dimmed ? "#334155" : "#64748b"}
              strokeWidth={2}
              fill="none"
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {/* Nodes */}
        {flat.map((n, i) => {
          const startAt = i * stepFrames + Math.round(stepFrames * 0.4);
          const enter = interpolate(
            frame, [startAt, startAt + Math.round(stepFrames * 0.6)], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.4, 0.6, 1) }
          );
          const scale = interpolate(enter, [0, 1], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          let fill = "#1e293b";
          let border = "#334155";
          const isLeaf = !flat.some(x => x.parentId === n.id);
          if (pruning && n.pruned) { fill = mix("#1e293b", "#ef4444", 0.4); border = "#ef4444"; }
          else if (n.memoized) { fill = mix("#1e293b", theme.primary, 0.4); border = theme.primary; }
          else if (isLeaf && pruning && !n.pruned) { fill = mix("#1e293b", accent, 0.5); border = accent; }

          // Return-value overlay
          const showRet = showReturns && n.returns !== undefined && frame >= returnPhaseStart;
          const retIdx = flat.length - 1 - i;   // reverse order for post-order unwind
          const retStart = returnPhaseStart + retIdx * Math.round(stepFrames * 0.5);
          const retOpacity = showRet
            ? interpolate(frame, [retStart, retStart + Math.round(stepFrames * 0.4)], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              })
            : 0;

          return (
            <g key={n.id} transform={`translate(${n.x}%, ${n.y}%)`}>
              <rect
                x={-50 * scale} y={-20 * scale}
                width={100 * scale} height={40 * scale}
                rx={8}
                fill={fill} stroke={border} strokeWidth={2}
              />
              <text textAnchor="middle" dy={5} fill="#f1f5f9" fontSize={14 * scale} fontWeight={700}>
                {n.label}
              </text>
              {n.memoized && (
                <text textAnchor="middle" dy={38} fill={theme.primary} fontSize={11} fontWeight={700}>
                  ✓ memo
                </text>
              )}
              {retOpacity > 0 && (
                <text textAnchor="middle" dy={-28} fill={accent} fontSize={14} fontWeight={800} opacity={retOpacity}>
                  → {n.returns}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
```

- [ ] **Step 6.4: Wire into registry**

Edit `frontend/src/registry.ts`:

```ts
import { RecursionTree, RecursionTreeSchema } from "./components/RecursionTree";
```

Entries:

```ts
// COMPONENT_REGISTRY
RecursionTree,

// COMPONENT_SCHEMAS
RecursionTree: RecursionTreeSchema,

// COMPONENT_META
RecursionTree: {
  category: "algorithm", dataOwner: "visual",
  bestAreas: ["main", "panel"],
  useWhen: "a recursive call tree, backtracking search, or memoization pattern being walked through",
  tags: ["recursion", "tree", "backtracking", "memoization", "call-stack"],
  minSeconds: 12,
},

// COMPONENT_CATALOG
RecursionTree: {
  description: "An animated recursion tree. Nodes grow in DFS order, then unwind with return values. Supports backtracking pruning (red dead-ends, green success paths) and memoization (memo-hit nodes stay collapsed).",
  schema: toJsonSchema(RecursionTreeSchema, "RecursionTreeProps"),
},
```

- [ ] **Step 6.5: Preview composition**

Edit `frontend/src/Root.tsx`:

```tsx
import { RecursionTree } from "./components/RecursionTree";
```

```tsx
<Composition
  id="preview-RecursionTree"
  component={RecursionTree}
  durationInFrames={30 * 20}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: "fib(4) with memoisation",
    root: {
      label: "fib(4)",
      returns: 3,
      children: [
        {
          label: "fib(3)",
          returns: 2,
          children: [
            {
              label: "fib(2)",
              returns: 1,
              children: [
                { label: "fib(1)", returns: 1 },
                { label: "fib(0)", returns: 0 },
              ],
            },
            { label: "fib(1)", returns: 1 },
          ],
        },
        { label: "fib(2)", returns: 1 },
      ],
    },
    showReturns: true,
    memoized: ["fib(2)"],
  }}
/>
```

- [ ] **Step 6.6: Visual verification**

Run Studio. Select `preview-RecursionTree`. Verify:
- Root `fib(4)` appears at top; children draw in DFS pre-order.
- `fib(2)` on the right branch appears with a "✓ memo" chip and does NOT expand (it's memoised).
- After the grow phase, return values appear above each node in reverse (post-order) order.

- [ ] **Step 6.7: Commit**

```bash
git add frontend/src/components/RecursionTree.tsx \
        frontend/src/components/RecursionTree.steps.ts \
        frontend/src/registry.ts \
        frontend/src/Root.tsx
git commit -m "feat(algo-pack): add RecursionTree component"
```

---

## Task 7: Final integration smoke test

**Files:** No changes.

- [ ] **Step 7.1: Typecheck the whole project**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7.2: Confirm registry export shape**

Run: `cd frontend && node -e "import('./src/registry.ts').then(m => console.log(Object.keys(m.COMPONENT_REGISTRY).length))"`
Expected: 34 (the original 28 + 6 new).

*(If the project uses ESM+tsx runners like `tsx`, adapt to: `npx tsx -e "…"`. If neither works, verify by opening `src/registry.ts` and counting entries in `COMPONENT_REGISTRY`.)*

- [ ] **Step 7.3: Studio smoke test — all 6 previews**

Run: `cd frontend && npx remotion studio`

Cycle through `preview-SortingVisualizer`, `preview-LinearStructure`, `preview-ArrayAlgorithm`, `preview-DPTableVisualizer`, `preview-GraphTraversal`, `preview-RecursionTree`. Each should render end-to-end without console errors and match the acceptance criteria described in its own task's verification step.

- [ ] **Step 7.4: Confirm no Tailwind `animate-*` or CSS `transition` slipped in**

Run: `grep -RE "animate-|transition:|animation:" frontend/src/components/{Sorting,Linear,Array,DPTable,GraphTraversal,Recursion}*` 
Expected: no matches (only allowed use of `transition` is `strokeDashoffset` transitions we never introduced; no CSS `transition` property should be present in inline `style` objects).

*(If matches surface, remove them — Remotion won't render them correctly.)*

- [ ] **Step 7.5: Final commit (only if anything changed above)**

If Step 7.4 required fixes, commit those:

```bash
git add frontend/src/components/
git commit -m "fix(algo-pack): remove non-Remotion-compatible CSS animations"
```

Otherwise, no commit needed — the pack is complete.

---

## Post-implementation checklist

Verify against the spec's success criteria (`docs/superpowers/specs/2026-07-04-algorithm-visualizer-pack-design.md` §8):

1. **All six components render in Remotion Studio driven only by their Zod-typed props.** → Confirmed via Task 1–6 verification + Task 7.3.
2. **`steps`-omitted default generators produce readable walkthroughs.** → Confirmed for the four with generators (SortingVisualizer, ArrayAlgorithm, GraphTraversal, RecursionTree via `flattenTree`).
3. **`useTheme()` flows through: changing the video theme changes accents.** → All six pull from `useTheme()`; a quick manual override via `defaultProps` for `accentColor` is exercised in Task 1's verification.
4. **`COMPONENT_META` and `COMPONENT_CATALOG` picked up without backend changes.** → Confirmed by Task 0 (union add) + Tasks 1–6 (registry entries) + no backend edits in this plan.
5. **No CSS `transition`, `animation`, or Tailwind `animate-*` in the pack.** → Confirmed by Task 7.4.

If all five pass, ship the branch as one PR titled `feat: algorithm visualizer pack (6 new components)` and reference the spec in the PR description.
