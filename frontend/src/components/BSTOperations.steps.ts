// BSTOperations.steps.ts — pure binary-search-tree / AVL step generation (no React).
// Uses an internal mutable tree WITH parent pointers so rotations can rewire the
// grandparent and the whole tree can be snapshotted after every mutation. Each
// step carries a deep clone of the tree, so the component just renders snapshots
// and tweens node positions between consecutive ones.

export type BSTBalance = "none" | "avl";

export type BSTOp = { op: "insert" | "search" | "delete"; value: number };

export type BSTSnapNode = {
  key: number;
  left?: BSTSnapNode;
  right?: BSTSnapNode;
};

export type BSTStepKind =
  | "compare" | "insert" | "rotate-left" | "rotate-right" | "found" | "miss" | "delete" | "settle";

export type BSTStep = {
  root: BSTSnapNode | null;
  active: number[];
  kind: BSTStepKind;
  caption: string;
};

type Node = {
  key: number;
  left: Node | null;
  right: Node | null;
  parent: Node | null;
  height: number;
};

export function generateBSTSteps(
  initial: number[],
  operations: BSTOp[],
  balance: BSTBalance = "none",
): BSTStep[] {
  let root = null as Node | null;
  const steps: BSTStep[] = [];

  const clone = (n: Node | null): BSTSnapNode | undefined => {
    if (!n) return undefined;
    const o: BSTSnapNode = { key: n.key };
    const l = clone(n.left);
    const r = clone(n.right);
    if (l) o.left = l;
    if (r) o.right = r;
    return o;
  };

  const snap = (active: number[], kind: BSTStepKind, caption: string) =>
    steps.push({ root: clone(root) ?? null, active, kind, caption });

  const height = (n: Node | null) => (n ? n.height : 0);
  const update = (n: Node) => {
    n.height = 1 + Math.max(height(n.left), height(n.right));
  };
  const bf = (n: Node) => height(n.left) - height(n.right);

  // Rewire the grandparent to point at the new subtree root. Capture the old
  // grandparent BEFORE touching any parent pointer, or we'd read a value we just
  // overwrote and create a self-cycle.
  function replaceChild(gp: Node | null, oldChild: Node, newChild: Node) {
    if (!gp) root = newChild;
    else if (gp.left === oldChild) gp.left = newChild;
    else gp.right = newChild;
  }

  function rotateRight(y: Node): Node {
    const x = y.left as Node;
    const gp = y.parent;
    const t2 = x.right;
    x.right = y;
    y.left = t2;
    x.parent = gp;
    y.parent = x;
    if (t2) t2.parent = y;
    replaceChild(gp, y, x);
    update(y);
    update(x);
    return x;
  }

  function rotateLeft(x: Node): Node {
    const y = x.right as Node;
    const gp = x.parent;
    const t2 = y.left;
    y.left = x;
    x.right = t2;
    y.parent = gp;
    x.parent = y;
    if (t2) t2.parent = x;
    replaceChild(gp, x, y);
    update(x);
    update(y);
    return y;
  }

  function rebalanceUp(start: Node | null) {
    if (balance !== "avl") return;
    let n = start;
    while (n) {
      update(n);
      const balanceFactor = bf(n);
      if (balanceFactor > 1) {
        const l = n.left as Node;
        if (bf(l) < 0) {
          const nl = rotateLeft(l);
          snap([nl.key], "rotate-left", `left-right case: rotate left at ${l.key}`);
        }
        const nr = rotateRight(n);
        snap([nr.key], "rotate-right", `rotate right at ${n.key} to rebalance`);
        n = nr;
      } else if (balanceFactor < -1) {
        const r = n.right as Node;
        if (bf(r) > 0) {
          const nr = rotateRight(r);
          snap([nr.key], "rotate-right", `right-left case: rotate right at ${r.key}`);
        }
        const nl = rotateLeft(n);
        snap([nl.key], "rotate-left", `rotate left at ${n.key} to rebalance`);
        n = nl;
      }
      n = n.parent;
    }
  }

  function insert(value: number) {
    if (!root) {
      root = { key: value, left: null, right: null, parent: null, height: 1 };
      snap([value], "insert", `insert ${value} as root`);
      return;
    }
    let cur: Node | null = root;
    let parent: Node = root;
    let goLeft = false;
    while (cur) {
      snap([cur.key], "compare", `${value} vs ${cur.key}`);
      parent = cur;
      if (value < cur.key) {
        goLeft = true;
        cur = cur.left;
      } else if (value > cur.key) {
        goLeft = false;
        cur = cur.right;
      } else {
        snap([cur.key], "found", `${value} already present`);
        return;
      }
    }
    const node: Node = { key: value, left: null, right: null, parent, height: 1 };
    if (goLeft) parent.left = node;
    else parent.right = node;
    snap([value], "insert", `insert ${value}`);
    rebalanceUp(node.parent);
  }

  function search(value: number) {
    let cur = root;
    while (cur) {
      snap([cur.key], "compare", `${value} vs ${cur.key}`);
      if (value === cur.key) {
        snap([cur.key], "found", `found ${value}`);
        return;
      }
      cur = value < cur.key ? cur.left : cur.right;
    }
    snap([], "miss", `${value} not found`);
  }

  function removeValue(value: number) {
    let cur = root;
    while (cur && cur.key !== value) {
      snap([cur.key], "compare", `${value} vs ${cur.key}`);
      cur = value < cur.key ? cur.left : cur.right;
    }
    if (!cur) {
      snap([], "miss", `${value} not found — nothing to delete`);
      return;
    }
    snap([cur.key], "found", `delete ${value}`);

    let toRemove = cur;
    if (cur.left && cur.right) {
      let succ = cur.right;
      while (succ.left) succ = succ.left;
      cur.key = succ.key;
      snap([succ.key], "delete", `replace with successor ${succ.key}`);
      toRemove = succ;
    }
    const child = toRemove.left ?? toRemove.right;
    const p = toRemove.parent;
    if (child) child.parent = p;
    if (!p) root = child;
    else if (p.left === toRemove) p.left = child;
    else p.right = child;
    snap(child ? [child.key] : [], "delete", `removed node`);
    rebalanceUp(p);
  }

  for (const v of initial) insert(v);
  for (const op of operations) {
    if (op.op === "insert") insert(op.value);
    else if (op.op === "search") search(op.value);
    else removeValue(op.value);
  }

  snap(root ? [root.key] : [], "settle", "done");
  return steps;
}
