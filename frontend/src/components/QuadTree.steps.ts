// QuadTree.steps.ts — pure point-quadtree step generation (no React).
// Region is the unit square; a leaf subdivides into 4 quadrants once it exceeds
// capacity. Each step snapshots the current leaf rectangles + all points.

export type Pt = { x: number; y: number }; // 0..1

export type QuadRect = { x: number; y: number; w: number; h: number };

export type QuadStepKind = "insert" | "subdivide" | "settle";

export type QuadStep = {
  rects: QuadRect[]; // current leaf boundaries
  points: Pt[]; // all points inserted so far
  capacity: number;
  activePoint: Pt | null;
  kind: QuadStepKind;
  caption: string;
};

type QNode = { x: number; y: number; w: number; h: number; points: Pt[]; children: QNode[] | null; depth: number };

export function generateQuadTreeSteps(points: Pt[], capacity = 1, maxDepth = 6): QuadStep[] {
  const root: QNode = { x: 0, y: 0, w: 1, h: 1, points: [], children: null, depth: 0 };
  const all: Pt[] = [];
  const steps: QuadStep[] = [];

  const leaves = (n: QNode, out: QuadRect[]) => {
    if (n.children) n.children.forEach((c) => leaves(c, out));
    else out.push({ x: n.x, y: n.y, w: n.w, h: n.h });
  };
  const snap = (activePoint: Pt | null, kind: QuadStepKind, caption: string) => {
    const rects: QuadRect[] = [];
    leaves(root, rects);
    steps.push({ rects, points: [...all], capacity, activePoint, kind, caption });
  };

  const quadrant = (n: QNode, p: Pt) => {
    const right = p.x >= n.x + n.w / 2 ? 1 : 0;
    const bottom = p.y >= n.y + n.h / 2 ? 1 : 0;
    return bottom * 2 + right;
  };

  const subdivide = (n: QNode) => {
    const hw = n.w / 2;
    const hh = n.h / 2;
    n.children = [
      { x: n.x, y: n.y, w: hw, h: hh, points: [], children: null, depth: n.depth + 1 },
      { x: n.x + hw, y: n.y, w: hw, h: hh, points: [], children: null, depth: n.depth + 1 },
      { x: n.x, y: n.y + hh, w: hw, h: hh, points: [], children: null, depth: n.depth + 1 },
      { x: n.x + hw, y: n.y + hh, w: hw, h: hh, points: [], children: null, depth: n.depth + 1 },
    ];
    for (const p of n.points) n.children[quadrant(n, p)].points.push(p);
    n.points = [];
  };

  // Subdivide an overflowing leaf, then recurse into any child that is still
  // over capacity (points can share a quadrant until they separate deeper down).
  const splitIfNeeded = (node: QNode, p: Pt) => {
    if (node.points.length > capacity && node.depth < maxDepth) {
      subdivide(node);
      snap(p, "subdivide", `leaf over capacity → subdivide into 4 quadrants`);
      node.children?.forEach((c) => splitIfNeeded(c, p));
    }
  };

  for (const p of points) {
    let node = root;
    while (node.children) node = node.children[quadrant(node, p)];
    node.points.push(p);
    all.push(p);
    snap(p, "insert", `insert point (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    splitIfNeeded(node, p);
  }

  snap(null, "settle", `${all.length} points in the quadtree`);
  return steps;
}
