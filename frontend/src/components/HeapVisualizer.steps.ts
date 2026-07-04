// HeapVisualizer.steps.ts — pure binary-heap step generation (no React).
// Each step carries a full snapshot of the heap array plus the indices being
// touched, so the component can render any step in isolation.

export type HeapKind = "min" | "max";

export type HeapOp =
  | { op: "insert"; value: number }
  | { op: "extract" };

export type HeapStepKind =
  | "insert" | "compare" | "swap" | "extract-root" | "pop" | "settle";

export type HeapStep = {
  heap: number[]; // snapshot AFTER this step's structural change
  active: number[]; // highlighted indices
  swap?: [number, number]; // indices whose values exchanged (for motion)
  kind: HeapStepKind;
  caption: string;
};

const parentIdx = (i: number) => Math.floor((i - 1) / 2);
const leftIdx = (i: number) => 2 * i + 1;
const rightIdx = (i: number) => 2 * i + 2;

export function generateHeapSteps(
  kind: HeapKind,
  initial: number[],
  operations: HeapOp[],
): HeapStep[] {
  const steps: HeapStep[] = [];
  const heap: number[] = [];
  // "higher priority" bubbles to the root: bigger for max-heap, smaller for min.
  const higher = (a: number, b: number) => (kind === "max" ? a > b : a < b);

  const snap = (
    active: number[],
    k: HeapStepKind,
    caption: string,
    swap?: [number, number],
  ) => steps.push({ heap: [...heap], active, kind: k, caption, swap });

  function siftUp(i: number) {
    while (i > 0) {
      const p = parentIdx(i);
      snap([i, p], "compare", `compare ${heap[i]} with parent ${heap[p]}`);
      if (higher(heap[i], heap[p])) {
        [heap[i], heap[p]] = [heap[p], heap[i]];
        snap([i, p], "swap", `swap ${heap[i]} ↔ ${heap[p]}`, [i, p]);
        i = p;
      } else break;
    }
  }

  function siftDown(i: number) {
    const n = heap.length;
    while (leftIdx(i) < n) {
      let best = leftIdx(i);
      const r = rightIdx(i);
      if (r < n && higher(heap[r], heap[best])) best = r;
      snap([i, best], "compare", `compare ${heap[i]} with child ${heap[best]}`);
      if (higher(heap[best], heap[i])) {
        [heap[i], heap[best]] = [heap[best], heap[i]];
        snap([i, best], "swap", `swap ${heap[i]} ↔ ${heap[best]}`, [i, best]);
        i = best;
      } else break;
    }
  }

  function insert(v: number) {
    heap.push(v);
    snap([heap.length - 1], "insert", `insert ${v}`);
    siftUp(heap.length - 1);
  }

  function extract() {
    if (heap.length === 0) return;
    const rootVal = heap[0];
    const last = heap.length - 1;
    if (last === 0) {
      heap.pop();
      snap([], "pop", `extract ${rootVal}`);
      return;
    }
    [heap[0], heap[last]] = [heap[last], heap[0]];
    snap([0, last], "extract-root", `remove ${rootVal}, move last to root`, [0, last]);
    heap.pop();
    snap([0], "pop", `${rootVal} removed`);
    siftDown(0);
  }

  for (const v of initial) insert(v);
  for (const o of operations) {
    if (o.op === "insert") insert(o.value);
    else extract();
  }

  snap([], "settle", "heap property satisfied");
  return steps;
}
