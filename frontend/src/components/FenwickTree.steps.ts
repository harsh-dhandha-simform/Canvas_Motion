// FenwickTree.steps.ts — pure Binary Indexed Tree step generation (no React).
// 1-indexed internally. update walks i += i&-i, prefix-sum walks i -= i&-i.
// Each step snapshots the BIT array + logical array + the active index / jump.

export type FenwickOperation =
  | { op: "update"; index: number; delta: number }
  | { op: "prefixSum"; index: number };

export type FenwickStepKind = "init" | "update" | "query" | "query-done" | "settle";

export type FenwickStep = {
  tree: number[]; // 1-indexed (tree[0] unused)
  arr: number[]; // logical 0-indexed array
  active: number | null; // active BIT index (1-based)
  jumpFrom: number | null; // previous BIT index (for the jump arc)
  sum: number | null; // running prefix-sum result
  kind: FenwickStepKind;
  caption: string;
};

const lowbit = (i: number) => i & -i;

export function generateFenwickSteps(
  values: number[],
  operations: FenwickOperation[],
): FenwickStep[] {
  const n = values.length;
  const arr = [...values];
  const tree = new Array(n + 1).fill(0);

  // Seed the BIT from the initial array (no steps — shown as the initial state).
  for (let idx = 0; idx < n; idx++) {
    let i = idx + 1;
    while (i <= n) {
      tree[i] += values[idx];
      i += lowbit(i);
    }
  }

  const steps: FenwickStep[] = [];
  const snap = (
    active: number | null,
    jumpFrom: number | null,
    sum: number | null,
    kind: FenwickStepKind,
    caption: string,
  ) => steps.push({ tree: [...tree], arr: [...arr], active, jumpFrom, sum, kind, caption });

  snap(null, null, null, "init", "Fenwick tree built from the array");

  for (const operation of operations) {
    if (operation.op === "update") {
      const { index, delta } = operation;
      arr[index] += delta;
      let i = index + 1;
      let from: number | null = null;
      while (i <= n) {
        tree[i] += delta;
        snap(i, from, null, "update", `tree[${i}] += ${delta}, then i += ${lowbit(i)}`);
        from = i;
        i += lowbit(i);
      }
    } else {
      const { index } = operation;
      let i = index + 1;
      let sum = 0;
      let from: number | null = null;
      while (i > 0) {
        sum += tree[i];
        snap(i, from, sum, "query", `sum += tree[${i}] = ${tree[i]}, then i -= ${lowbit(i)}`);
        from = i;
        i -= lowbit(i);
      }
      snap(null, null, sum, "query-done", `prefixSum(0..${index}) = ${sum}`);
    }
  }

  snap(null, null, null, "settle", "done");
  return steps;
}
