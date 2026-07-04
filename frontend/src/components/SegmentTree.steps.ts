// SegmentTree.steps.ts — pure segment-tree step generation (no React).
// The tree structure (node ranges) is fixed after build; only aggregate values
// change on update. Each step snapshots the current values + what is active.

export type SegOp = "sum" | "min" | "max";

export type SegNode = { idx: number; lo: number; hi: number };

export type SegOperation =
  | { op: "query"; lo: number; hi: number }
  | { op: "update"; index: number; value: number };

export type SegStepKind =
  | "build" | "visit-full" | "visit-partial" | "visit-disjoint" | "descend" | "update" | "query-done" | "settle";

export type SegStep = {
  values: Record<number, number>;
  active: number[];
  covered: number[];
  result: number | null;
  kind: SegStepKind;
  caption: string;
};

export function generateSegmentTreeSteps(
  values: number[],
  op: SegOp,
  operations: SegOperation[],
): { nodes: SegNode[]; steps: SegStep[] } {
  const n = values.length;
  const seg: Record<number, number> = {};
  const nodes: SegNode[] = [];
  const arr = [...values];

  const identity = op === "sum" ? 0 : op === "min" ? Infinity : -Infinity;
  const combine = (a: number, b: number) =>
    op === "sum" ? a + b : op === "min" ? Math.min(a, b) : Math.max(a, b);

  function build(node: number, lo: number, hi: number) {
    nodes.push({ idx: node, lo, hi });
    if (lo === hi) {
      seg[node] = arr[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    build(2 * node, lo, mid);
    build(2 * node + 1, mid + 1, hi);
    seg[node] = combine(seg[2 * node], seg[2 * node + 1]);
  }
  build(1, 0, n - 1);
  nodes.sort((a, b) => a.idx - b.idx);

  const steps: SegStep[] = [];
  const snap = (
    active: number[],
    covered: number[],
    result: number | null,
    kind: SegStepKind,
    caption: string,
  ) => steps.push({ values: { ...seg }, active, covered, result, kind, caption });

  snap([], [], null, "build", `segment tree built (${op})`);

  const rangeOf = (node: number) => nodes.find((x) => x.idx === node) as SegNode;

  for (const operation of operations) {
    if (operation.op === "query") {
      const { lo: ql, hi: qr } = operation;
      const covered: number[] = [];
      let result = identity;
      const query = (node: number) => {
        const { lo, hi } = rangeOf(node);
        if (qr < lo || hi < ql) {
          snap([node], [...covered], result, "visit-disjoint", `[${lo},${hi}] is outside [${ql},${qr}] — skip`);
          return;
        }
        if (ql <= lo && hi <= qr) {
          covered.push(node);
          result = combine(result, seg[node]);
          snap([node], [...covered], result, "visit-full", `[${lo},${hi}] ⊆ query → take ${seg[node]}`);
          return;
        }
        snap([node], [...covered], result, "visit-partial", `[${lo},${hi}] partially overlaps → split`);
        query(2 * node);
        query(2 * node + 1);
      };
      query(1);
      snap([], [...covered], result, "query-done", `${op}[${ql},${qr}] = ${result}`);
    } else {
      const { index, value } = operation;
      const path: number[] = [];
      let node = 1;
      // Descend to the leaf covering `index`.
      while (true) {
        const { lo, hi } = rangeOf(node);
        path.push(node);
        snap([node], [], null, "descend", `descend to index ${index}`);
        if (lo === hi) break;
        const mid = (lo + hi) >> 1;
        node = index <= mid ? 2 * node : 2 * node + 1;
      }
      const leaf = path[path.length - 1];
      seg[leaf] = value;
      snap([leaf], [], null, "update", `set index ${index} = ${value}`);
      // Recombine ancestors bottom-up.
      for (let i = path.length - 2; i >= 0; i--) {
        const a = path[i];
        seg[a] = combine(seg[2 * a], seg[2 * a + 1]);
        snap([a], [], null, "update", `recompute node → ${seg[a]}`);
      }
    }
  }

  snap([], [], null, "settle", "done");
  return { nodes, steps };
}
