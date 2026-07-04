// UnionFind.steps.ts — pure disjoint-set (union-find) step generation (no React).
// Elements keep fixed positions in the component; only the parent-pointer arrows
// change, so each step just snapshots the parent[] array plus what is active.

export type UFOp =
  | { op: "union"; a: string; b: string }
  | { op: "find"; a: string };

export type UFStepKind =
  | "find-walk" | "link" | "compress" | "connected" | "settle";

export type UFStep = {
  parent: number[]; // index → parent index (self when root)
  active: number[]; // highlighted element indices
  link?: [number, number]; // [child, parent] arrow introduced this step
  kind: UFStepKind;
  caption: string;
};

export function generateUnionFindSteps(
  labels: string[],
  operations: UFOp[],
  byRank = true,
  pathCompression = true,
): UFStep[] {
  const n = labels.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);
  const indexOf = new Map(labels.map((l, i) => [l, i]));
  const steps: UFStep[] = [];

  const snap = (
    active: number[],
    kind: UFStepKind,
    caption: string,
    link?: [number, number],
  ) => steps.push({ parent: [...parent], active, kind, caption, link });

  // Walk to the root, emitting one highlight step per hop.
  function findRootWalk(i: number, verb: string): number {
    const path: number[] = [i];
    snap([...path], "find-walk", `${verb} ${labels[i]}`);
    while (parent[i] !== i) {
      i = parent[i];
      path.push(i);
      snap([...path], "find-walk", `→ ${labels[i]}`);
    }
    // Path compression: point every node on the path straight at the root.
    if (pathCompression && path.length > 2) {
      const root = i;
      for (const node of path) {
        if (node !== root && parent[node] !== root) {
          parent[node] = root;
          snap([node, root], "compress", `compress ${labels[node]} → ${labels[root]}`);
        }
      }
    }
    return i;
  }

  function union(aLabel: string, bLabel: string) {
    const a = indexOf.get(aLabel);
    const b = indexOf.get(bLabel);
    if (a === undefined || b === undefined) return;
    const ra = findRootWalk(a, `find root of`);
    const rb = findRootWalk(b, `find root of`);
    if (ra === rb) {
      snap([ra], "connected", `${aLabel} and ${bLabel} already connected`);
      return;
    }
    let child = rb;
    let root = ra;
    if (byRank) {
      if (rank[ra] < rank[rb]) {
        child = ra;
        root = rb;
      } else if (rank[ra] === rank[rb]) {
        rank[ra]++;
      }
    }
    parent[child] = root;
    snap([child, root], "link", `union: link ${labels[child]} under ${labels[root]}`, [child, root]);
  }

  for (const op of operations) {
    if (op.op === "union") union(op.a, op.b);
    else {
      const i = indexOf.get(op.a);
      if (i !== undefined) findRootWalk(i, `find`);
    }
  }

  snap([], "settle", "done");
  return steps;
}
