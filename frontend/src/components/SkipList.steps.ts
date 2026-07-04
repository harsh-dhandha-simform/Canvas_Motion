// SkipList.steps.ts — pure skip-list step generation (no React).
// Deterministic node heights (from trailing 1-bits of the value, or an explicit
// `level`), so runs are reproducible — Math.random is unavailable in this env.
// Each step snapshots the sorted node set + the current (index, level) pointer.

export type SkipOperation =
  | { op: "insert"; value: number; level?: number }
  | { op: "search"; value: number };

export type SLNode = { value: number; height: number };

export type SkipStepKind =
  | "walk" | "walk-right" | "drop" | "insert" | "found" | "miss" | "settle";

export type SkipStep = {
  nodes: SLNode[]; // sorted ascending
  maxLevel: number;
  activeIndex: number; // -1 = HEAD sentinel
  activeLevel: number;
  foundIndex: number | null;
  target: number | null;
  kind: SkipStepKind;
  caption: string;
};

export function generateSkipListSteps(
  operations: SkipOperation[],
  maxLevel = 4,
): SkipStep[] {
  const nodes: SLNode[] = [];
  const steps: SkipStep[] = [];

  const defaultHeight = (v: number) => {
    let h = 1;
    let x = v;
    while (x > 0 && x % 2 === 1 && h < maxLevel) {
      h++;
      x = (x - 1) / 2;
    }
    return h;
  };

  const snap = (
    activeIndex: number,
    activeLevel: number,
    foundIndex: number | null,
    target: number | null,
    kind: SkipStepKind,
    caption: string,
  ) =>
    steps.push({
      nodes: nodes.map((n) => ({ ...n })),
      maxLevel,
      activeIndex,
      activeLevel,
      foundIndex,
      target,
      kind,
      caption,
    });

  // Walk from the HEAD down to level 0, stopping just before `v`. Returns the
  // index of the node we end on (-1 = HEAD).
  const descend = (v: number): number => {
    let cur = -1;
    for (let L = maxLevel - 1; L >= 0; L--) {
      snap(cur, L, null, v, "walk", `level ${L}: start at ${cur < 0 ? "HEAD" : nodes[cur].value}`);
      while (true) {
        let j = cur + 1;
        while (j < nodes.length && nodes[j].height <= L) j++;
        if (j < nodes.length && nodes[j].value < v) {
          cur = j;
          snap(cur, L, null, v, "walk-right", `move right to ${nodes[j].value}`);
        } else break;
      }
      if (L > 0) snap(cur, L, null, v, "drop", `drop to level ${L - 1}`);
    }
    return cur;
  };

  for (const op of operations) {
    if (op.op === "search") {
      const cur = descend(op.value);
      const j = cur + 1;
      if (j < nodes.length && nodes[j].value === op.value) {
        snap(j, 0, j, op.value, "found", `found ${op.value}`);
      } else {
        snap(cur, 0, null, op.value, "miss", `${op.value} not found`);
      }
    } else {
      const h = op.level ? Math.max(1, Math.min(op.level, maxLevel)) : defaultHeight(op.value);
      descend(op.value);
      // insert in sorted order
      let pos = 0;
      while (pos < nodes.length && nodes[pos].value < op.value) pos++;
      if (pos < nodes.length && nodes[pos].value === op.value) continue; // duplicate
      nodes.splice(pos, 0, { value: op.value, height: h });
      snap(pos, h - 1, null, op.value, "insert", `insert ${op.value} (height ${h})`);
    }
  }

  snap(-1, 0, null, null, "settle", "done");
  return steps;
}
