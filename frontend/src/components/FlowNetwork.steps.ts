// FlowNetwork.steps.ts — pure Edmonds-Karp max-flow step generation (no React).
// Repeatedly BFS the residual graph for a shortest augmenting path, push the
// bottleneck, and update flows. Each step snapshots edge flows and the path.

export type FlowNode = { id: string; x: number; y: number }; // x,y in 0..100
export type FlowEdgeInput = { from: string; to: string; capacity: number };
export type FlowEdge = { from: string; to: string; cap: number; flow: number };

export type FlowStepKind = "find" | "augment" | "done" | "settle";

export type FlowStep = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  pathNodes: string[];
  bottleneck: number | null;
  maxFlow: number;
  kind: FlowStepKind;
  caption: string;
};

const key = (u: string, v: string) => `${u}|${v}`;

export function generateFlowSteps(
  nodes: FlowNode[],
  edges: FlowEdgeInput[],
  source: string,
  sink: string,
): FlowStep[] {
  const cap: Record<string, number> = {};
  const flow: Record<string, number> = {};
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    cap[key(e.from, e.to)] = (cap[key(e.from, e.to)] || 0) + e.capacity;
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from); // residual reverse edge
  }
  const residual = (u: string, v: string) => (cap[key(u, v)] || 0) - (flow[key(u, v)] || 0);

  const steps: FlowStep[] = [];
  let maxFlow = 0;
  const snapEdges = (): FlowEdge[] =>
    edges.map((e) => ({ from: e.from, to: e.to, cap: e.capacity, flow: Math.max(0, flow[key(e.from, e.to)] || 0) }));
  const snap = (pathNodes: string[], bottleneck: number | null, kind: FlowStepKind, caption: string) =>
    steps.push({ nodes, edges: snapEdges(), pathNodes, bottleneck, maxFlow, kind, caption });

  const bfsPath = (): string[] | null => {
    const parent = new Map<string, string>();
    const seen = new Set<string>([source]);
    const queue = [source];
    while (queue.length) {
      const u = queue.shift() as string;
      if (u === sink) break;
      for (const v of adj.get(u) ?? []) {
        if (!seen.has(v) && residual(u, v) > 0) {
          seen.add(v);
          parent.set(v, u);
          queue.push(v);
        }
      }
    }
    if (!seen.has(sink)) return null;
    const path: string[] = [sink];
    let cur = sink;
    while (cur !== source) {
      cur = parent.get(cur) as string;
      path.unshift(cur);
    }
    return path;
  };

  while (true) {
    const path = bfsPath();
    if (!path) break;
    let bottleneck = Infinity;
    for (let i = 0; i + 1 < path.length; i++) bottleneck = Math.min(bottleneck, residual(path[i], path[i + 1]));
    snap(path, bottleneck, "find", `augmenting path ${path.join(" → ")} (bottleneck ${bottleneck})`);
    for (let i = 0; i + 1 < path.length; i++) {
      const u = path[i];
      const v = path[i + 1];
      flow[key(u, v)] = (flow[key(u, v)] || 0) + bottleneck;
      flow[key(v, u)] = (flow[key(v, u)] || 0) - bottleneck;
    }
    maxFlow += bottleneck;
    snap(path, bottleneck, "augment", `push ${bottleneck} — total flow = ${maxFlow}`);
  }

  snap([], null, "done", `max flow = ${maxFlow}`);
  snap([], null, "settle", "done");
  return steps;
}
