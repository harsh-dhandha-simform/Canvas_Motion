// IntervalScheduling.steps.ts — pure greedy activity-selection step generation.
// Sort intervals by end time, then greedily keep each interval whose start is
// ≥ the last selected end. Each step snapshots selection state.

export type IntervalInput = { start: number; end: number; label?: string };
export type IntervalRow = { id: number; start: number; end: number; label: string };

export type IntervalStepKind = "sort" | "consider" | "select" | "reject" | "settle";

export type IntervalStep = {
  intervals: IntervalRow[]; // sorted order
  selected: number[];
  rejected: number[];
  current: number | null;
  lastEnd: number | null;
  kind: IntervalStepKind;
  caption: string;
};

export function greedySelect(intervals: IntervalInput[]): number[] {
  const rows = intervals.map((iv, i) => ({ ...iv, id: i }));
  rows.sort((a, b) => a.end - b.end);
  const out: number[] = [];
  let lastEnd = -Infinity;
  for (const iv of rows) {
    if (iv.start >= lastEnd) {
      out.push(iv.id);
      lastEnd = iv.end;
    }
  }
  return out;
}

export function generateIntervalSteps(intervals: IntervalInput[]): IntervalStep[] {
  const rows: IntervalRow[] = intervals.map((iv, i) => ({
    id: i,
    start: iv.start,
    end: iv.end,
    label: iv.label ?? String.fromCharCode(65 + i),
  }));
  const sorted = [...rows].sort((a, b) => a.end - b.end);

  const steps: IntervalStep[] = [];
  const selected: number[] = [];
  const rejected: number[] = [];
  let lastEnd: number | null = null;
  const snap = (current: number | null, kind: IntervalStepKind, caption: string) =>
    steps.push({
      intervals: sorted.map((r) => ({ ...r })),
      selected: [...selected],
      rejected: [...rejected],
      current,
      lastEnd,
      kind,
      caption,
    });

  snap(null, "sort", "sort intervals by end time");

  for (const iv of sorted) {
    snap(iv.id, "consider", `consider ${iv.label} [${iv.start}, ${iv.end}]`);
    if (lastEnd === null || iv.start >= lastEnd) {
      selected.push(iv.id);
      lastEnd = iv.end;
      snap(iv.id, "select", `select ${iv.label} — finishes at ${iv.end}`);
    } else {
      rejected.push(iv.id);
      snap(iv.id, "reject", `${iv.label} overlaps (starts ${iv.start} < ${lastEnd}) — skip`);
    }
  }

  snap(null, "settle", `${selected.length} activities selected`);
  return steps;
}
