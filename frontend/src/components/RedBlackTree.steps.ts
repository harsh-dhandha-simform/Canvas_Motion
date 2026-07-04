// RedBlackTree.steps.ts — pure red-black-tree insert step generation (no React).
// CLRS-style insert + fixup (recolor / rotate). Insert-only for now. Uses an
// internal mutable tree with parent pointers so rotations can rewire cleanly and
// the whole tree can be snapshotted after every mutation.

export type RBColor = "R" | "B";

export type RBSnapNode = {
  key: number;
  color: RBColor;
  left?: RBSnapNode;
  right?: RBSnapNode;
};

export type RBStepKind =
  | "compare" | "insert" | "recolor" | "rotate-left" | "rotate-right" | "settle";

export type RBStep = {
  root: RBSnapNode | null;
  active: number[];
  kind: RBStepKind;
  caption: string;
};

type Node = {
  key: number;
  left: Node | null;
  right: Node | null;
  parent: Node | null;
  color: RBColor;
};

export function generateRedBlackSteps(
  initial: number[],
  values: number[],
): RBStep[] {
  let root = null as Node | null;
  const steps: RBStep[] = [];
  const colorOf = (n: Node | null): RBColor => (n ? n.color : "B");

  const clone = (n: Node | null): RBSnapNode | undefined => {
    if (!n) return undefined;
    const o: RBSnapNode = { key: n.key, color: n.color };
    const l = clone(n.left);
    const r = clone(n.right);
    if (l) o.left = l;
    if (r) o.right = r;
    return o;
  };
  const snap = (active: number[], kind: RBStepKind, caption: string) =>
    steps.push({ root: clone(root) ?? null, active, kind, caption });

  const replaceChild = (gp: Node | null, oldC: Node, newC: Node) => {
    if (!gp) root = newC;
    else if (gp.left === oldC) gp.left = newC;
    else gp.right = newC;
  };

  function rotateLeft(x: Node) {
    const y = x.right as Node;
    const gp = x.parent;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.left = x;
    y.parent = gp;
    x.parent = y;
    replaceChild(gp, x, y);
  }
  function rotateRight(y: Node) {
    const x = y.left as Node;
    const gp = y.parent;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.right = y;
    x.parent = gp;
    y.parent = x;
    replaceChild(gp, y, x);
  }

  function fixup(z: Node) {
    while (z.parent && z.parent.color === "R") {
      const p = z.parent;
      const gp = p.parent as Node; // parent is red ⇒ not root ⇒ grandparent exists
      if (p === gp.left) {
        const uncle = gp.right;
        if (colorOf(uncle) === "R") {
          p.color = "B";
          (uncle as Node).color = "B";
          gp.color = "R";
          snap([p.key, gp.key], "recolor", `uncle red → recolor parent, uncle, grandparent`);
          z = gp;
        } else {
          if (z === p.right) {
            z = p;
            rotateLeft(z);
            snap([z.key], "rotate-left", `rotate left to straighten`);
          }
          z.parent!.color = "B";
          gp.color = "R";
          snap([z.parent!.key, gp.key], "recolor", `recolor then rotate right`);
          rotateRight(gp);
          snap([gp.key], "rotate-right", `rotate right at ${gp.key}`);
        }
      } else {
        const uncle = gp.left;
        if (colorOf(uncle) === "R") {
          p.color = "B";
          (uncle as Node).color = "B";
          gp.color = "R";
          snap([p.key, gp.key], "recolor", `uncle red → recolor parent, uncle, grandparent`);
          z = gp;
        } else {
          if (z === p.left) {
            z = p;
            rotateRight(z);
            snap([z.key], "rotate-right", `rotate right to straighten`);
          }
          z.parent!.color = "B";
          gp.color = "R";
          snap([z.parent!.key, gp.key], "recolor", `recolor then rotate left`);
          rotateLeft(gp);
          snap([gp.key], "rotate-left", `rotate left at ${gp.key}`);
        }
      }
    }
    if (root && root.color !== "B") {
      root.color = "B";
      snap([root.key], "recolor", `root is always black`);
    }
  }

  function insert(v: number) {
    const z: Node = { key: v, left: null, right: null, parent: null, color: "R" };
    if (!root) {
      root = z;
      snap([v], "insert", `insert ${v} (red)`);
      fixup(z);
      return;
    }
    let cur: Node | null = root;
    let parent: Node = root;
    while (cur) {
      snap([cur.key], "compare", `${v} vs ${cur.key}`);
      parent = cur;
      if (v < cur.key) cur = cur.left;
      else if (v > cur.key) cur = cur.right;
      else return; // duplicate — ignore
    }
    z.parent = parent;
    if (v < parent.key) parent.left = z;
    else parent.right = z;
    snap([v], "insert", `insert ${v} (red)`);
    fixup(z);
  }

  for (const v of initial) insert(v);
  for (const v of values) insert(v);

  snap(root ? [root.key] : [], "settle", "red-black properties restored");
  return steps;
}
