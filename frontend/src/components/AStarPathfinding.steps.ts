// AStarPathfinding.steps.ts — pure A* on a 4-connected grid (no React).
// Deterministic tie-breaking (lowest f, then h, then id) so runs reproduce.
// Each step snapshots open/closed sets, g/h/f scores, the current cell, and the
// final path once found.

export type Cell = [number, number]; // [row, col]
export type Heuristic = "manhattan" | "euclidean";

export type AStarStepKind = "expand" | "close" | "relax" | "path" | "no-path" | "settle";

export type AStarStep = {
  open: number[];
  closed: number[];
  current: number | null;
  path: number[];
  g: Record<number, number>;
  f: Record<number, number>;
  kind: AStarStepKind;
  caption: string;
};

export function generateAStarSteps(
  rows: number,
  cols: number,
  walls: Cell[],
  start: Cell,
  goal: Cell,
  heuristic: Heuristic = "manhattan",
): AStarStep[] {
  const id = (r: number, c: number) => r * cols + c;
  const wallSet = new Set(walls.map(([r, c]) => id(r, c)));
  const startId = id(start[0], start[1]);
  const goalId = id(goal[0], goal[1]);

  const rowOf = (i: number) => Math.floor(i / cols);
  const colOf = (i: number) => i % cols;
  const h = (i: number) => {
    const dr = Math.abs(rowOf(i) - goal[0]);
    const dc = Math.abs(colOf(i) - goal[1]);
    return heuristic === "euclidean" ? Math.round(Math.hypot(dr, dc) * 10) / 10 : dr + dc;
  };

  const g: Record<number, number> = { [startId]: 0 };
  const f: Record<number, number> = { [startId]: h(startId) };
  const cameFrom: Record<number, number> = {};
  const open: number[] = [startId];
  const openSet = new Set(open);
  const closed = new Set<number>();

  const steps: AStarStep[] = [];
  const snap = (current: number | null, path: number[], kind: AStarStepKind, caption: string) =>
    steps.push({
      open: [...open],
      closed: [...closed],
      current,
      path,
      g: { ...g },
      f: { ...f },
      kind,
      caption,
    });

  const neighbors = (i: number): number[] => {
    const r = rowOf(i);
    const c = colOf(i);
    const out: number[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !wallSet.has(id(nr, nc))) out.push(id(nr, nc));
    }
    return out;
  };

  while (open.length) {
    // pick lowest f, tie-break on h, then id
    let best = open[0];
    for (const i of open) {
      if (f[i] < f[best] || (f[i] === f[best] && (h(i) < h(best) || (h(i) === h(best) && i < best)))) best = i;
    }
    const current = best;
    snap(current, [], "expand", `expand cell with f=${f[current]}`);

    if (current === goalId) {
      const path: number[] = [];
      let cur: number | undefined = current;
      while (cur !== undefined) {
        path.unshift(cur);
        cur = cameFrom[cur];
      }
      snap(current, path, "path", `goal reached — path length ${path.length - 1}`);
      snap(null, path, "settle", "done");
      return steps;
    }

    open.splice(open.indexOf(current), 1);
    openSet.delete(current);
    closed.add(current);
    snap(current, [], "close", `close cell, expand neighbours`);

    for (const nb of neighbors(current)) {
      if (closed.has(nb)) continue;
      const tentative = g[current] + 1;
      if (!openSet.has(nb) || tentative < g[nb]) {
        cameFrom[nb] = current;
        g[nb] = tentative;
        f[nb] = tentative + h(nb);
        if (!openSet.has(nb)) {
          open.push(nb);
          openSet.add(nb);
        }
        snap(nb, [], "relax", `relax neighbour: g=${g[nb]}, h=${h(nb)}, f=${f[nb]}`);
      }
    }
  }

  snap(null, [], "no-path", "no path to the goal");
  snap(null, [], "settle", "done");
  return steps;
}
