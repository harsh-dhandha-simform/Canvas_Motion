// StronglyConnectedComponents.steps.ts — pure Tarjan SCC step generation (no React).
// DFS assigning index/low-link, a node stack, and closing an SCC whenever
// low == index. Each step snapshots index/low/onStack/component state.

export type SccNode = { id: string; x: number; y: number };
export type SccEdge = { from: string; to: string };

export type SccStepKind = "visit" | "edge" | "update" | "scc" | "settle";

export type SccStep = {
  nodes: SccNode[];
  edges: SccEdge[];
  index: Record<string, number>;
  low: Record<string, number>;
  onStack: string[];
  comp: Record<string, number>;
  current: string | null;
  activeEdge: [string, string] | null;
  kind: SccStepKind;
  caption: string;
};

export function generateSccSteps(nodes: SccNode[], edges: SccEdge[]): SccStep[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.from)?.push(e.to);

  const index: Record<string, number> = {};
  const low: Record<string, number> = {};
  const onStackSet = new Set<string>();
  const stack: string[] = [];
  const comp: Record<string, number> = {};
  let counter = 0;
  let compCount = 0;
  const steps: SccStep[] = [];

  const snap = (
    current: string | null,
    activeEdge: [string, string] | null,
    kind: SccStepKind,
    caption: string,
  ) =>
    steps.push({
      nodes,
      edges,
      index: { ...index },
      low: { ...low },
      onStack: [...stack],
      comp: { ...comp },
      current,
      activeEdge,
      kind,
      caption,
    });

  const strongconnect = (v: string) => {
    index[v] = counter;
    low[v] = counter;
    counter++;
    stack.push(v);
    onStackSet.add(v);
    snap(v, null, "visit", `visit ${v}: index=${index[v]}, low=${low[v]}`);

    for (const w of adj.get(v) ?? []) {
      snap(v, [v, w], "edge", `explore edge ${v} → ${w}`);
      if (index[w] === undefined) {
        strongconnect(w);
        low[v] = Math.min(low[v], low[w]);
        snap(v, [v, w], "update", `low[${v}] = min(low[${v}], low[${w}]) = ${low[v]}`);
      } else if (onStackSet.has(w)) {
        low[v] = Math.min(low[v], index[w]);
        snap(v, [v, w], "update", `back-edge: low[${v}] = ${low[v]}`);
      }
    }

    if (low[v] === index[v]) {
      const members: string[] = [];
      let w: string;
      do {
        w = stack.pop() as string;
        onStackSet.delete(w);
        comp[w] = compCount;
        members.push(w);
      } while (w !== v);
      snap(v, null, "scc", `${v} is an SCC root → component {${members.join(", ")}}`);
      compCount++;
    }
  };

  for (const n of nodes) if (index[n.id] === undefined) strongconnect(n.id);

  snap(null, null, "settle", `${compCount} strongly connected component(s)`);
  return steps;
}
