# Algorithm Visualizer Pack — Design

**Date:** 2026-07-04
**Scope:** Six new Remotion scene components that add algorithm / data-structure walkthrough visuals to the Canvas Motion library. Shipped as one coordinated pack so the planner and assembler agents get consistent step-based motion across the whole category.

## 1. Motivation

The current registry has 28 components heavy in cards, static node graphs, and text-centered scenes. Explainer scenes are starting to feel visually repetitive: nearly every "list" is a card list, nearly every "diagram" is a static node graph, and nearly every "chart" is a bar / line / pie. The registry has **no motion vocabulary for algorithm walkthroughs** — sort swaps, DP grid fills, pointer sweeps, graph frontier spread, recursion unfolding. Those are all distinct visual dynamics that the current 28 components cannot express, and they are exactly the kind of scene a CS / DSA explainer needs.

This pack ships six components covering roughly 28 of a 33-item algorithm/DS list a stakeholder produced, consolidated where items were visually near-identical (e.g., seven "SearchTree" variants collapse into a `kind`-parameterised `RecursionTree`/`GraphTraversal`, or fold into the existing `TreeHierarchy`). Consolidation is deliberate — presenting seven near-identical picks to the planner degrades its choice quality.

## 2. Scope

**In-scope:**

- `SortingVisualizer`
- `DPTableVisualizer`
- `ArrayAlgorithm` (unified: `binary-search`, `sliding-window`, `two-pointer`)
- `GraphTraversal` (unified: `dfs`, `bfs`, `dijkstra`, `bellman-ford`, `topo-sort`, `mst-prim`, `mst-kruskal`)
- `LinearStructure` (unified: `array`, `stack`, `queue`, `deque`, `linked-list`)
- `RecursionTree` (also handles backtracking via a `pruning` mode and memoization via a `memoized` list)
- One new shared helper file `src/components/_shared/anim.ts`
- Registry wiring (`COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`, `COMPONENT_META`, `COMPONENT_CATALOG`, new `"algorithm"` category)
- One built-in step generator per component (except `LinearStructure`, whose `operations` are its steps; and `DPTableVisualizer`, whose `fills` are its steps)

**Out-of-scope:**

- Specialised BST/AVL/Red-Black/Trie/Segment/Fenwick tree components — the existing `TreeHierarchy` covers static trees, and `RecursionTree` covers growing trees. Adding seven near-identical trees would flood the planner without adding visual variety.
- `GraphVisualizer` (static) — already covered by `FlowDiagram`, `PacketFlow`, `ArchitectureDiagram`.
- `ComplexityComparison` — already covered by `LineChart`.
- Backend planner / assembler changes — this pack is picked up automatically via `COMPONENT_META` + `COMPONENT_CATALOG`.
- Unit tests for step generators — deferred; if desired, add as a follow-up. Current project style verifies scenes visually in Remotion Studio.

## 3. Shared conventions (applies to all six)

### 3.1 Motion primitives

- **Entrance stagger:** `spring({ frame: frame - offset, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 35 })` — matches the existing `BarChart` cadence for consistency across the library.
- **Step-based interpolation:** every visualiser walks a list of `steps`. Each step has a computed `startFrame = i * stepDurationFrames` where `stepDurationFrames = (1.2 / (props.speed ?? 1)) * fps`. Any frame-derived value inside a step uses `interpolate(frame, [start, start + revealFrames], [...], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })`. **`revealFrames` = 18 frames (≈0.6s at 30fps)** — roughly half of `stepDurationFrames` at `speed = 1`, so a step's animation completes before its dwell ends.
- **Colour transitions across steps:** interpolated via `mix(a, b, t)` — a small hex-lerp helper in the shared file.
- **Forbidden:** CSS `transition`, CSS `animation`, Tailwind `animate-*` classes — these do not render in Remotion.
- **Transforms:** individual properties (`scale`, `translate`, `rotate`) inline in `style`, not composed `transform` strings — keeps values editable in Remotion Studio, matching the project rule.

### 3.2 Theme integration

Every component calls `useTheme()` and uses:

| Role | Colour source |
|---|---|
| Active / current cell or node | `theme.accent` |
| Secondary highlight (pointer B, frontier) | `theme.primary` |
| Just-visited / settled | `theme.secondary` |
| Inert cell fill | `#1e293b` |
| Cell / edge border | `#334155` |
| Primary text | `#f1f5f9` |
| Muted text | `#64748b` |
| Pruned / rejected (Kruskal) | `#ef4444` |

All six schemas also expose an optional `accentColor?: string` which overrides `theme.accent` for that scene — matching the existing `BarChart` / `LineChart` pattern.

### 3.3 Schema style

- Every visualiser schema has: `title?`, an algorithm/mode/kind discriminator, an algorithm-specific `data` block, an optional `steps` override array, and an optional `speed?` multiplier.
- When `steps` is omitted, the component runs a **built-in step generator** for the given algorithm from the input data. This keeps the planner's job small: it passes data, not choreography. Planners *may* pass `steps` explicitly when they want to hand-craft a walkthrough (e.g., stop early, add narration hooks).
- All schemas export a named `<Name>Schema` and an inferred `type <Name>Props = z.infer<typeof …Schema>`, matching the existing convention.
- **Universal optional props on every schema:** `speed?: number` (default `1`, feeds `stepDurationFrames`) and `accentColor?: string` (overrides `theme.accent` for the scene). Per-schema tables in §4 may omit these for brevity — treat them as always present.

### 3.4 File layout

```
src/components/
  _shared/
    anim.ts                        # mix(), stepAt(), resolveSteps()
  SortingVisualizer.tsx
  SortingVisualizer.steps.ts
  DPTableVisualizer.tsx
  ArrayAlgorithm.tsx
  ArrayAlgorithm.steps.ts
  GraphTraversal.tsx
  GraphTraversal.steps.ts
  LinearStructure.tsx
  RecursionTree.tsx
  RecursionTree.steps.ts
```

The `_shared/` prefix signals that files there are NOT scene components and should not be added to `COMPONENT_REGISTRY`.

## 4. Component specs

### 4.1 `SortingVisualizer`

**Purpose:** Animated bar swaps / moves showing a sorting algorithm at work. Breaks the "static chart" rhythm with continuous micro-motion — a visual dynamic the current library does not have.

**Schema:**

```ts
export const SortingVisualizerSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum(["bubble", "merge", "quick", "heap", "radix", "counting"]),
  values: z.array(z.number()),
  steps: z.array(z.object({
    kind: z.enum(["compare", "swap", "set", "partition", "merge-write"]),
    indices: z.array(z.number()),
    writeValue: z.number().optional(),
    note: z.string().optional(),
  })).optional(),
  speed: z.number().optional(),
  showComparisonCounter: z.boolean().optional(),
  accentColor: z.string().optional(),
});
```

**Motion story:**

- Bars laid out horizontally along the bottom, height proportional to value, index labels below each bar.
- `compare`: both indexed bars pulse `accent` for the duration of the step.
- `swap`: both bars translate to each other's x-position along a shallow arc (mid-motion `translate: 0px -20px`), values follow the bars.
- `set`: bar height animates from previous to new; brief flash at the transition.
- `partition` (quicksort): pivot bar receives `theme.primary` and a vertical bracket appears; `<` and `>` regions tint.
- `merge-write` (mergesort): destination cell fades to accent, value writes in place.
- Sorted region tinted `theme.secondary` at 40% opacity as it grows from the sorted end.
- Optional counter in top-right ticks comparisons / swaps.

**Best areas:** `main`, `panel`. **minSeconds:** 10.

**Planner cue (`useWhen`):** *"a sorting algorithm being walked through, or comparing sort algorithms visually"*.

### 4.2 `DPTableVisualizer`

**Purpose:** A 2D grid of cells that fill in over time with values propagating from prior cells. New geometric motion pattern. Also the natural home for matrix algorithms (Floyd-Warshall, edit distance, LCS, knapsack).

**Schema:**

```ts
export const DPTableVisualizerSchema = z.object({
  title: z.string().optional(),
  rows: z.number(),
  cols: z.number(),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  fills: z.array(z.object({
    row: z.number(),
    col: z.number(),
    value: z.union([z.string(), z.number()]),
    dependsOn: z.array(z.object({ row: z.number(), col: z.number() })).optional(),
    note: z.string().optional(),
  })),
  highlightPath: z.array(z.object({
    row: z.number(),
    col: z.number(),
  })).optional(),
  accentColor: z.string().optional(),
});
```

**Motion story:**

- Empty grid sketches in first — row and column lines animate their length from 0 to 100% over 12 frames.
- For each fill: (1) `dependsOn` cells pulse `theme.primary` for 8 frames, (2) a thin arrow draws from each dependency to the target cell, (3) target cell scales `0.6 → 1` while its value fades in.
- After all fills, `highlightPath` cells transition to `theme.accent` in sequence, tracing the optimal solution / traceback path.

**Best areas:** `main`, `panel`. **minSeconds:** 12.

**Planner cue:** *"a 2D DP table being filled cell-by-cell, or a matrix-based algorithm (LCS, edit distance, Floyd-Warshall, knapsack)"*.

### 4.3 `ArrayAlgorithm` (unified)

**Purpose:** Indexed cells with pointer overlays that move over time. One component; a `mode` discriminator picks the choreography for binary search / sliding window / two-pointer.

**Schema:**

```ts
export const ArrayAlgorithmSchema = z.object({
  title: z.string().optional(),
  mode: z.enum(["binary-search", "sliding-window", "two-pointer"]),
  values: z.array(z.union([z.number(), z.string()])),
  target: z.union([z.number(), z.string()]).optional(),
  steps: z.array(z.object({
    pointers: z.record(z.string(), z.number()),
    windowSum: z.number().optional(),
    note: z.string().optional(),
    result: z.enum([
      "found", "narrow-left", "narrow-right",
      "expand", "shrink", "advance",
    ]).optional(),
  })).optional(),
  accentColor: z.string().optional(),
});
```

**Motion story:**

- Cells drawn in a row with index labels below.
- **`binary-search`:** three labelled arrow markers (`L`, `M`, `R`) sit under the array. Each step, markers translate to their new indices with a bezier ease. The excluded half fades to 30% opacity. `found` result pulses `theme.accent` on the matched cell.
- **`sliding-window`:** a translucent `accent` box wraps `[start..end]`. `expand` extends the right edge; `shrink` pulls the left edge in; a running `windowSum` floats above the window.
- **`two-pointer`:** two labelled arrows (`i`, `j` — labels from the `pointers` record) converge / diverge. Cells between them stay lit. When step `result: "found"`, an arc briefly draws between the two pointers.

**Best areas:** `main`, `panel`. **minSeconds:** 8.

**Planner cue:** *"an array-scan algorithm — binary search, sliding window, or two-pointer technique"*.

### 4.4 `GraphTraversal` (unified)

**Purpose:** A graph where visited / frontier state spreads across nodes and edges over time. Distinct from the static `FlowDiagram` / `PacketFlow` / `ArchitectureDiagram` because the motion story is the algorithm's exploration order.

**Schema:**

```ts
export const GraphTraversalSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum([
    "dfs", "bfs", "dijkstra", "bellman-ford",
    "topo-sort", "mst-prim", "mst-kruskal",
  ]),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    x: z.number(),   // 0-100 percentage
    y: z.number(),   // 0-100 percentage
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    weight: z.number().optional(),
    directed: z.boolean().optional(),
  })),
  start: z.string().optional(),
  steps: z.array(z.object({
    kind: z.enum([
      "visit", "enqueue", "relax", "settle",
      "mst-select", "mst-reject", "topo-emit",
    ]),
    node: z.string().optional(),
    edge: z.object({ from: z.string(), to: z.string() }).optional(),
    distance: z.number().optional(),
    note: z.string().optional(),
  })).optional(),
  showDistanceTable: z.boolean().optional(),
  accentColor: z.string().optional(),
});
```

**Motion story:**

- Nodes fade in with a light spring on scene entry; edges draw via stroke-dashoffset from 0 to full length; weights appear as small pills mid-edge.
- **Node states:** unvisited = `#1e293b` fill / `#334155` border; frontier = `theme.primary` with a soft glow; visited / settled = `theme.secondary`; current = `theme.accent` with a pulse ring.
- **Edge states:** neutral gray; relaxed = brief `theme.accent` sweep along the edge; MST-selected = thick `theme.accent`; MST-rejected (Kruskal) = quick red flash then dim.
- **Distance table** (`dijkstra`, `bellman-ford`, when `showDistanceTable`): right-side column of `node → distance` rows. Changed cells pulse and re-count from the previous value.
- **`topo-emit`:** node lifts out of the graph and slides into a queue row along the bottom.

**Best areas:** `main`, `panel`. **minSeconds:** 12.

**Planner cue:** *"a graph algorithm being traced — DFS/BFS traversal, shortest path (Dijkstra/Bellman-Ford), MST, or topological sort"*.

### 4.5 `LinearStructure` (unified)

**Purpose:** Cells or nodes in a row with push / pop / enqueue / dequeue / insert / delete motion. Base primitive for the "linear DS" section of any DSA explainer.

**Schema:**

```ts
export const LinearStructureSchema = z.object({
  title: z.string().optional(),
  kind: z.enum(["array", "stack", "queue", "deque", "linked-list"]),
  initial: z.array(z.union([z.number(), z.string()])),
  operations: z.array(z.object({
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
  })),
  showIndices: z.boolean().optional(),
  showHeadTail: z.boolean().optional(),
  accentColor: z.string().optional(),
});
```

**Motion story:**

- **`array`:** cells in a row, indices below. `insert-at k` shifts cells `k..end` right by one cell width over 16 frames; new cell fades in at index `k` with a scale from 0.6 to 1. `delete-at` is the reverse.
- **`stack`:** cells stacked vertically. `push` drops a new cell in from above with a spring settle. `pop` scales+fades the top cell up and out. `TOP` label tracks the top.
- **`queue`:** cells in a row. `enqueue` fades a new cell in at the tail from `+40px x`. `dequeue` slides the head cell out to the left and shifts the rest left. `HEAD` / `TAIL` labels track their cells.
- **`deque`:** both ends behave like queue via `push-front` / `push-back` / `pop-front` / `pop-back`.
- **`linked-list`:** node = rounded box + `→` arrow to next. `insert-at k` retracts the arrow at `k-1`, fades in the new node, then redraws arrows in sequence. `HEAD` / `TAIL` labelled.
- `read` on `array` briefly highlights the indexed cell without mutating.

**Best areas:** `panel`, `main`. **minSeconds:** 8.

**Planner cue:** *"a linear data structure — array, stack, queue, deque, or linked list — being mutated by a sequence of operations"*.

### 4.6 `RecursionTree`

**Purpose:** A tree that *grows* as recursion unfolds and *unwinds* with return values. The motion story a static tree can't tell. Also serves backtracking and memoization patterns.

**Schema:**

```ts
type TreeNode = {
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
```

**Motion story:**

- Root appears at top center. Children draw in one at a time in DFS order.
- Each child spawn: parent's edge stroke draws over 12 frames, then child node scales `0 → 1` with a slight overshoot spring.
- **`pruning`:** children marked `pruned: true` briefly turn `#ef4444`, their subtree is not expanded, and the edge dims to 20%. Successful leaf paths glow `theme.accent`, and the arc from root to leaf gets a subtle traveling sweep.
- **`showReturns`:** on unwind (reverse DFS order), return values fade in above each node in post-order, and a small arrow pulses from child to parent.
- **`memoized`:** nodes whose `label` appears in the `memoized` list get a "🗸 memo" chip and are drawn small and dimmed without expanding a subtree.

**Best areas:** `main`, `panel`. **minSeconds:** 12.

**Planner cue:** *"a recursive call tree, backtracking search, or memoization pattern being walked through"*.

## 5. Shared helper file

**`src/components/_shared/anim.ts`** — pure functions only, no React imports.

```ts
// Interpolate between two hex colours (e.g. "#ff0000" and "#00ff00") at t in [0, 1].
export function mix(a: string, b: string, t: number): string { ... }

// For step-based visualisers: how far into `step` are we, and is it the active step?
export function stepAt(step: number, opts: {
  stepFrames: number;
  frame: number;
  fps: number;
}): { progress: number; entering: boolean } { ... }

// Return the explicit steps when the planner provided them, otherwise run the generator.
export function resolveSteps<T>(explicit: T[] | undefined, generate: () => T[]): T[] { ... }
```

## 6. Step generators

Each generator is a plain function taking the schema's data fields and returning the `steps` array. Files live next to each component (see file layout in §3.4).

- `SortingVisualizer.steps.ts` — per-algorithm generators for bubble / merge / quick / heap / radix / counting.
- `ArrayAlgorithm.steps.ts` — per-mode generators for binary-search / sliding-window / two-pointer (the latter two need a `target` or window-size cue via the caller, otherwise fall back to a demo trace).
- `GraphTraversal.steps.ts` — per-algorithm generators built on a small shared BFS/DFS/Dijkstra core.
- `RecursionTree.steps.ts` — derives DFS entry / return order from the tree data, respecting `pruned` and `memoized`.
- `LinearStructure` has no separate generator: its `operations` are its steps.
- `DPTableVisualizer` has no default generator: the planner or scene author provides `fills` (DP recurrences vary too much to auto-generate meaningfully).

## 7. Registry changes

### 7.1 Category union

Add `"algorithm"` to `ComponentMeta['category']` in `src/registry.ts`.

### 7.2 `COMPONENT_REGISTRY` and `COMPONENT_SCHEMAS`

Add six imports at the top of `src/registry.ts` and six lines each in `COMPONENT_REGISTRY` and `COMPONENT_SCHEMAS` — matching the existing pattern exactly.

### 7.3 `COMPONENT_META`

Six entries (full text under §4). All share `category: "algorithm"` and `dataOwner: "visual"` (Visual Architect populates the algorithm data, not the Scriptwriter).

### 7.4 `COMPONENT_CATALOG`

Six entries following the existing pattern — one-sentence description + `toJsonSchema(schema, "<Name>Props")`.

### 7.5 Backend impact

Zero backend code changes. The `Planner` / `Assembler` agents read `COMPONENT_META` and `COMPONENT_CATALOG` from the registry, so wiring these six entries in is the only touchpoint.

## 8. Success criteria

1. All six components render in Remotion Studio for at least one representative composition, driven only by their Zod-typed props.
2. When `steps` is omitted (for the four that support generators), the built-in generator produces a walkthrough that reads correctly at the component's `minSeconds`.
3. `useTheme()` values flow through: changing the video theme changes the visualiser's accent / primary / secondary colours.
4. `COMPONENT_META` and `COMPONENT_CATALOG` entries are picked up by the backend without any backend-side code change.
5. No CSS `transition`, CSS `animation`, or Tailwind `animate-*` classes anywhere in the pack (Remotion-render constraint).

## 9. Explicit non-goals

- Not adding backend-side prompt tuning for the new components. If planner picks feel wrong after ship, tune tags / `useWhen` cues in a follow-up.
- Not shipping specialised BST / AVL / Red-Black / Trie / Segment / Fenwick / B-Tree components — folded into `TreeHierarchy` (static) and `RecursionTree` (growing / labelled).
- Not shipping a standalone `GraphVisualizer` (static) — covered by `FlowDiagram` / `PacketFlow` / `ArchitectureDiagram`.
- Not shipping `ComplexityComparison` — covered by `LineChart`.
- Not adding unit tests. If desired, a follow-up spec can cover step-generator tests.
