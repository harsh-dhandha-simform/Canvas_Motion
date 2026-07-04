import type { GraphStep } from "./GraphTraversal";

type NodeId = string;
type Edge = { from: NodeId; to: NodeId; weight?: number; directed?: boolean };

function neighbors(edges: Edge[], node: NodeId): { to: NodeId; weight: number }[] {
  const out: { to: NodeId; weight: number }[] = [];
  for (const e of edges) {
    if (e.from === node) out.push({ to: e.to, weight: e.weight ?? 1 });
    if (!e.directed && e.to === node) out.push({ to: e.from, weight: e.weight ?? 1 });
  }
  return out;
}

function dfsSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<NodeId>();
  function go(u: NodeId) {
    visited.add(u);
    steps.push({ kind: "visit", node: u });
    for (const { to } of neighbors(edges, u)) {
      if (!visited.has(to)) {
        steps.push({ kind: "enqueue", edge: { from: u, to } });
        go(to);
      }
    }
  }
  go(start);
  // suppress unused parameter warning
  void nodes;
  return steps;
}

function bfsSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<NodeId>([start]);
  const queue: NodeId[] = [start];
  steps.push({ kind: "visit", node: start });
  while (queue.length) {
    const u = queue.shift()!;
    for (const { to } of neighbors(edges, u)) {
      if (!visited.has(to)) {
        visited.add(to);
        steps.push({ kind: "enqueue", edge: { from: u, to } });
        steps.push({ kind: "visit", node: to });
        queue.push(to);
      }
    }
  }
  // suppress unused parameter warning
  void nodes;
  return steps;
}

function dijkstraSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const dist = new Map<NodeId, number>();
  const settled = new Set<NodeId>();
  for (const n of nodes) dist.set(n.id, Infinity);
  dist.set(start, 0);
  steps.push({ kind: "visit", node: start, distance: 0 });

  while (settled.size < nodes.length) {
    let u: NodeId | null = null;
    let best = Infinity;
    for (const n of nodes) {
      const d = dist.get(n.id)!;
      if (!settled.has(n.id) && d < best) { best = d; u = n.id; }
    }
    if (u === null) break;
    settled.add(u);
    steps.push({ kind: "settle", node: u, distance: best });
    for (const { to, weight } of neighbors(edges, u)) {
      const nd = best + weight;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        steps.push({ kind: "relax", edge: { from: u, to }, node: to, distance: nd });
      }
    }
  }
  return steps;
}

function bellmanFordSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const dist = new Map<NodeId, number>();
  for (const n of nodes) dist.set(n.id, Infinity);
  dist.set(start, 0);
  steps.push({ kind: "visit", node: start, distance: 0 });
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of edges) {
      const du = dist.get(e.from) ?? Infinity;
      const w = e.weight ?? 1;
      const nd = du + w;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        steps.push({ kind: "relax", edge: { from: e.from, to: e.to }, node: e.to, distance: nd });
      }
    }
  }
  return steps;
}

function topoSteps(nodes: { id: NodeId }[], edges: Edge[]): GraphStep[] {
  const steps: GraphStep[] = [];
  const indeg = new Map<NodeId, number>();
  for (const n of nodes) indeg.set(n.id, 0);
  for (const e of edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue: NodeId[] = [];
  for (const n of nodes) if (indeg.get(n.id) === 0) queue.push(n.id);
  while (queue.length) {
    const u = queue.shift()!;
    steps.push({ kind: "topo-emit", node: u });
    for (const e of edges) if (e.from === u) {
      const nd = (indeg.get(e.to) ?? 0) - 1;
      indeg.set(e.to, nd);
      if (nd === 0) queue.push(e.to);
    }
  }
  return steps;
}

function primSteps(nodes: { id: NodeId }[], edges: Edge[], start: NodeId): GraphStep[] {
  const steps: GraphStep[] = [];
  const inTree = new Set<NodeId>([start]);
  steps.push({ kind: "visit", node: start });
  while (inTree.size < nodes.length) {
    let best: { e: Edge; from: NodeId; to: NodeId } | null = null;
    for (const e of edges) {
      const w = e.weight ?? 1;
      const inFrom = inTree.has(e.from), inTo = inTree.has(e.to);
      const usable = (inFrom && !inTo) || (!e.directed && !inFrom && inTo);
      if (usable && (best === null || w < (best.e.weight ?? 1))) {
        const from = inFrom ? e.from : e.to;
        const to = inFrom ? e.to : e.from;
        best = { e, from, to };
      }
    }
    if (!best) break;
    steps.push({ kind: "mst-select", edge: { from: best.from, to: best.to } });
    inTree.add(best.to);
  }
  return steps;
}

// Union-Find for Kruskal
function makeDsu(ids: NodeId[]) {
  const parent = new Map<NodeId, NodeId>();
  for (const id of ids) parent.set(id, id);
  function find(x: NodeId): NodeId {
    if (parent.get(x) === x) return x;
    const r = find(parent.get(x)!);
    parent.set(x, r);
    return r;
  }
  function union(a: NodeId, b: NodeId): boolean {
    const ra = find(a), rb = find(b);
    if (ra === rb) return false;
    parent.set(ra, rb);
    return true;
  }
  return { find, union };
}

function kruskalSteps(nodes: { id: NodeId }[], edges: Edge[]): GraphStep[] {
  const steps: GraphStep[] = [];
  const sorted = [...edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const dsu = makeDsu(nodes.map(n => n.id));
  for (const e of sorted) {
    if (dsu.union(e.from, e.to)) {
      steps.push({ kind: "mst-select", edge: { from: e.from, to: e.to } });
    } else {
      steps.push({ kind: "mst-reject", edge: { from: e.from, to: e.to } });
    }
  }
  return steps;
}

export function generateGraphSteps(
  algorithm: string,
  nodes: { id: NodeId }[],
  edges: Edge[],
  start?: NodeId,
): GraphStep[] {
  const s = start ?? nodes[0]?.id;
  if (!s) return [];
  switch (algorithm) {
    case "dfs": return dfsSteps(nodes, edges, s);
    case "bfs": return bfsSteps(nodes, edges, s);
    case "dijkstra": return dijkstraSteps(nodes, edges, s);
    case "bellman-ford": return bellmanFordSteps(nodes, edges, s);
    case "topo-sort": return topoSteps(nodes, edges);
    case "mst-prim": return primSteps(nodes, edges, s);
    case "mst-kruskal": return kruskalSteps(nodes, edges);
    default: return [];
  }
}
