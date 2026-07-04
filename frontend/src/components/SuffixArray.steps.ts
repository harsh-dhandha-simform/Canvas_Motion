// SuffixArray.steps.ts — pure suffix-array step generation (no React).
// Lists all suffixes, sorts them lexicographically (the suffix array), then
// binary-searches a pattern. Each step snapshots the current row order + search
// pointers.

export type SuffixRow = { index: number; suffix: string };

export type SuffixStepKind = "list" | "sort" | "search" | "found" | "miss" | "settle";

export type SuffixStep = {
  order: SuffixRow[];
  lo: number | null;
  hi: number | null;
  mid: number | null;
  matchRow: number | null; // row in the sorted order
  pattern: string | null;
  kind: SuffixStepKind;
  caption: string;
};

export function buildSuffixArray(text: string): SuffixRow[] {
  const rows: SuffixRow[] = [];
  for (let i = 0; i < text.length; i++) rows.push({ index: i, suffix: text.slice(i) });
  return rows.slice().sort((a, b) => (a.suffix < b.suffix ? -1 : a.suffix > b.suffix ? 1 : 0));
}

export function generateSuffixArraySteps(text: string, pattern: string): SuffixStep[] {
  const original: SuffixRow[] = [];
  for (let i = 0; i < text.length; i++) original.push({ index: i, suffix: text.slice(i) });
  const sorted = buildSuffixArray(text);

  const steps: SuffixStep[] = [];
  const snap = (
    order: SuffixRow[],
    lo: number | null,
    hi: number | null,
    mid: number | null,
    matchRow: number | null,
    kind: SuffixStepKind,
    caption: string,
  ) => steps.push({ order: order.map((r) => ({ ...r })), lo, hi, mid, matchRow, pattern, kind, caption });

  snap(original, null, null, null, null, "list", `${text.length} suffixes of "${text}"`);
  snap(sorted, null, null, null, null, "sort", `sorted → suffix array`);

  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    snap(sorted, lo, hi, mid, null, "search", `binary search: compare "${pattern}" with suffix[${mid}]`);
    const prefix = sorted[mid].suffix.slice(0, pattern.length);
    if (prefix === pattern) {
      found = mid;
      break;
    }
    if (pattern < prefix) hi = mid - 1;
    else lo = mid + 1;
  }

  if (found >= 0) {
    snap(sorted, lo, hi, found, found, "found", `"${pattern}" found at text index ${sorted[found].index}`);
  } else {
    snap(sorted, lo, hi, null, null, "miss", `"${pattern}" not found`);
  }

  snap(sorted, null, null, null, found >= 0 ? found : null, "settle", "done");
  return steps;
}
