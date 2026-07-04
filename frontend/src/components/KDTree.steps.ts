// KDTree.steps.ts — pure 2D k-d tree step generation (no React).
// Insert points one by one, alternating the split axis by depth (even → x,
// odd → y). Each node's split line spans its region. Snapshots the plane's split
// lines + points; also returns the final tree for validation.

export type Pt = { x: number; y: number }; // 0..1
export type KDLine = { axis: "x" | "y"; pos: number; a: number; b: number };
export type KDSnapNode = { pt: Pt; axis: 0 | 1; left?: KDSnapNode; right?: KDSnapNode };

export type KDStepKind = "compare" | "insert" | "settle";

export type KDStep = {
  points: Pt[];
  lines: KDLine[];
  activePoint: Pt | null;
  comparePoint: Pt | null;
  kind: KDStepKind;
  caption: string;
};

type Node = {
  pt: Pt;
  axis: 0 | 1;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  left: Node | null;
  right: Node | null;
};

const fmt = (v: number) => v.toFixed(2);

export function generateKDTreeSteps(points: Pt[]): { steps: KDStep[]; root: KDSnapNode | null } {
  let root: Node | null = null;
  const lines: KDLine[] = [];
  const inserted: Pt[] = [];
  const steps: KDStep[] = [];

  const mk = (pt: Pt, axis: 0 | 1, x0: number, x1: number, y0: number, y1: number): Node => ({
    pt, axis, x0, x1, y0, y1, left: null, right: null,
  });
  const lineOf = (n: Node): KDLine =>
    n.axis === 0 ? { axis: "x", pos: n.pt.x, a: n.y0, b: n.y1 } : { axis: "y", pos: n.pt.y, a: n.x0, b: n.x1 };
  const snap = (activePoint: Pt | null, comparePoint: Pt | null, kind: KDStepKind, caption: string) =>
    steps.push({ points: [...inserted], lines: [...lines], activePoint, comparePoint, kind, caption });

  for (const pt of points) {
    inserted.push(pt);
    if (!root) {
      root = mk(pt, 0, 0, 1, 0, 1);
      lines.push(lineOf(root));
      snap(pt, null, "insert", `insert (${fmt(pt.x)}, ${fmt(pt.y)}) — root splits on x`);
      continue;
    }
    let node = root;
    let depth = 0;
    while (true) {
      const axis = node.axis;
      const label = axis === 0 ? `x: ${fmt(pt.x)} vs ${fmt(node.pt.x)}` : `y: ${fmt(pt.y)} vs ${fmt(node.pt.y)}`;
      snap(pt, node.pt, "compare", `compare ${label}`);
      const goLeft = axis === 0 ? pt.x < node.pt.x : pt.y < node.pt.y;
      let x0 = node.x0;
      let x1 = node.x1;
      let y0 = node.y0;
      let y1 = node.y1;
      if (axis === 0) {
        if (goLeft) x1 = node.pt.x;
        else x0 = node.pt.x;
      } else {
        if (goLeft) y1 = node.pt.y;
        else y0 = node.pt.y;
      }
      const next = goLeft ? node.left : node.right;
      if (!next) {
        const child = mk(pt, ((depth + 1) % 2) as 0 | 1, x0, x1, y0, y1);
        if (goLeft) node.left = child;
        else node.right = child;
        lines.push(lineOf(child));
        snap(pt, node.pt, "insert", `insert (${fmt(pt.x)}, ${fmt(pt.y)})`);
        break;
      }
      node = next;
      depth++;
    }
  }

  const toSnap = (n: Node | null): KDSnapNode | undefined => {
    if (!n) return undefined;
    const o: KDSnapNode = { pt: n.pt, axis: n.axis };
    const l = toSnap(n.left);
    const r = toSnap(n.right);
    if (l) o.left = l;
    if (r) o.right = r;
    return o;
  };

  snap(null, null, "settle", `${inserted.length} points in the k-d tree`);
  return { steps, root: toSnap(root) ?? null };
}
