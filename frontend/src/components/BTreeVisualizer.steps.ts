// BTreeVisualizer.steps.ts — pure B-tree insert step generation (no React).
// Order m ⇒ max m-1 keys per node. Insert descends to a leaf, adds the key, then
// splits any overflowing node (median promoted), cascading toward the root. Each
// step snapshots the whole tree + the active node's path.

export type BTreeSnapNode = {
  keys: number[];
  children: BTreeSnapNode[];
};

export type BTreeStepKind = "descend" | "insert" | "split" | "settle";

export type BTreeStep = {
  root: BTreeSnapNode | null;
  activePath: number[] | null; // child-index path from root to the active node
  activeKeys: number[]; // highlighted key indices within the active node
  kind: BTreeStepKind;
  caption: string;
};

type Node = { keys: number[]; children: Node[]; parent: Node | null };

export function generateBTreeSteps(order: number, values: number[]): BTreeStep[] {
  const maxKeys = Math.max(2, order) - 1;
  let root: Node = { keys: [], children: [], parent: null };
  const steps: BTreeStep[] = [];

  const clone = (n: Node): BTreeSnapNode => ({
    keys: [...n.keys],
    children: n.children.map(clone),
  });
  const pathOf = (node: Node): number[] => {
    const p: number[] = [];
    let cur = node;
    while (cur.parent) {
      p.unshift(cur.parent.children.indexOf(cur));
      cur = cur.parent;
    }
    return p;
  };
  const snap = (node: Node, activeKeys: number[], kind: BTreeStepKind, caption: string) =>
    steps.push({ root: clone(root), activePath: pathOf(node), activeKeys, kind, caption });

  function split(node: Node): Node {
    const mid = Math.floor(node.keys.length / 2);
    const median = node.keys[mid];
    const left: Node = { keys: node.keys.slice(0, mid), children: node.children.slice(0, mid + 1), parent: null };
    const right: Node = { keys: node.keys.slice(mid + 1), children: node.children.slice(mid + 1), parent: null };
    left.children.forEach((c) => (c.parent = left));
    right.children.forEach((c) => (c.parent = right));

    const parent = node.parent;
    if (!parent) {
      root = { keys: [median], children: [left, right], parent: null };
      left.parent = root;
      right.parent = root;
      snap(root, [0], "split", `split: promote ${median} into a new root`);
      return root;
    }
    const ci = parent.children.indexOf(node);
    parent.children.splice(ci, 1, left, right);
    left.parent = parent;
    right.parent = parent;
    parent.keys.splice(ci, 0, median);
    snap(parent, [ci], "split", `split child: promote ${median} up`);
    return parent;
  }

  function insert(v: number) {
    let cur = root;
    while (cur.children.length > 0) {
      snap(cur, [], "descend", `descend for ${v}`);
      let i = 0;
      while (i < cur.keys.length && v > cur.keys[i]) i++;
      cur = cur.children[i];
    }
    // insert into leaf, keep keys sorted
    let pos = 0;
    while (pos < cur.keys.length && v > cur.keys[pos]) pos++;
    cur.keys.splice(pos, 0, v);
    snap(cur, [pos], "insert", `insert ${v} into leaf`);

    let node: Node = cur;
    while (node.keys.length > maxKeys) {
      node = split(node);
    }
  }

  for (const v of values) insert(v);

  snap(root, [], "settle", "done");
  return steps;
}
