// GraphColoring.steps.ts — pure greedy vertex-coloring step generation (no React).
// For each vertex in order, assign the smallest color not used by its already-
// colored neighbors. Each step snapshots the color assignment + what is active.

export type ColorNode = { id: string; x: number; y: number };
export type ColorEdge = { from: string; to: string };

export type ColorStepKind = "pick" | "check" | "assign" | "settle";

export type ColorStep = {
  nodes: ColorNode[];
  edges: ColorEdge[];
  colorOf: Record<string, number>;
  current: string | null;
  checkingNeighbor: string | null;
  used: number[];
  numColors: number;
  kind: ColorStepKind;
  caption: string;
};

export function generateColoringSteps(nodes: ColorNode[], edges: ColorEdge[]): ColorStep[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  }

  const colorOf: Record<string, number> = {};
  const out: ColorStep[] = [];

  const numColors = () => {
    const vals = Object.values(colorOf);
    return vals.length ? Math.max(...vals) + 1 : 0;
  };
  const snap = (
    current: string | null,
    checkingNeighbor: string | null,
    used: number[],
    kind: ColorStepKind,
    caption: string,
  ) =>
    out.push({
      nodes,
      edges,
      colorOf: { ...colorOf },
      current,
      checkingNeighbor,
      used,
      numColors: numColors(),
      kind,
      caption,
    });

  for (const n of nodes) {
    const v = n.id;
    snap(v, null, [], "pick", `color vertex ${v}`);
    const used = new Set<number>();
    for (const w of adj.get(v) ?? []) {
      if (colorOf[w] !== undefined) {
        used.add(colorOf[w]);
        snap(v, w, [...used], "check", `neighbour ${w} uses color ${colorOf[w]}`);
      }
    }
    let c = 0;
    while (used.has(c)) c++;
    colorOf[v] = c;
    snap(v, null, [...used], "assign", `assign color ${c} to ${v}`);
  }

  snap(null, null, [], "settle", `graph colored with ${numColors()} color(s)`);
  return out;
}
