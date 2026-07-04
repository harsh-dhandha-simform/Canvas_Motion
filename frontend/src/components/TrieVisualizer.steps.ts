// TrieVisualizer.steps.ts — pure trie (prefix tree) step generation (no React).
// Two passes: (1) build the full trie from every insert op and lay it out so
// node positions stay stable across the whole animation; (2) replay the ops in
// order, revealing nodes and tracing search/prefix walks step by step.

export type TrieOp = {
  op: "insert" | "search" | "prefix";
  word: string;
};

export type TrieNodeLayout = {
  id: string; // the prefix string; root is ""
  char: string; // single char label ("•" for the root)
  parentId: string | null;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
};

export type TrieStepKind =
  | "descend" | "create" | "mark-end" | "hit" | "miss" | "settle";

export type TrieStep = {
  existing: string[]; // node ids present at this step
  endNodes: string[]; // node ids that are end-of-word at this step
  active: string[]; // highlighted node ids
  kind: TrieStepKind;
  caption: string;
};

type RawNode = {
  id: string;
  char: string;
  parentId: string | null;
  children: Map<string, RawNode>;
  x: number;
  depth: number;
};

export function generateTrieSteps(operations: TrieOp[]): {
  layout: TrieNodeLayout[];
  steps: TrieStep[];
} {
  const root: RawNode = {
    id: "",
    char: "•",
    parentId: null,
    children: new Map(),
    x: 0,
    depth: 0,
  };

  // Pass 1 — build the complete trie from all inserts.
  for (const op of operations) {
    if (op.op !== "insert") continue;
    let cur = root;
    for (const ch of op.word) {
      let child = cur.children.get(ch);
      if (!child) {
        child = {
          id: cur.id + ch,
          char: ch,
          parentId: cur.id,
          children: new Map(),
          x: 0,
          depth: cur.depth + 1,
        };
        cur.children.set(ch, child);
      }
      cur = child;
    }
  }

  // Layout — leaves get sequential x, internal nodes centre over their children.
  let leaf = 0;
  let maxDepth = 0;
  const assign = (node: RawNode) => {
    maxDepth = Math.max(maxDepth, node.depth);
    const kids = [...node.children.values()].sort((a, b) => a.char.localeCompare(b.char));
    if (kids.length === 0) {
      node.x = leaf++;
    } else {
      kids.forEach(assign);
      node.x = (kids[0].x + kids[kids.length - 1].x) / 2;
    }
  };
  assign(root);

  const maxX = Math.max(1, leaf - 1);
  const layout: TrieNodeLayout[] = [];
  const collect = (node: RawNode) => {
    layout.push({
      id: node.id,
      char: node.char,
      parentId: node.parentId,
      x: leaf <= 1 ? 0.5 : node.x / maxX,
      y: (node.depth + 0.5) / (maxDepth + 1),
    });
    node.children.forEach(collect);
  };
  collect(root);

  // Pass 2 — replay ops in order, tracking what exists and what is an end-node.
  const existing = new Set<string>([""]);
  const endNow = new Set<string>();
  const steps: TrieStep[] = [];
  const snap = (active: string[], kind: TrieStepKind, caption: string) =>
    steps.push({
      existing: [...existing],
      endNodes: [...endNow],
      active,
      kind,
      caption,
    });

  for (const op of operations) {
    let curId = "";
    if (op.op === "insert") {
      snap([""], "descend", `insert "${op.word}"`);
      for (const ch of op.word) {
        const childId = curId + ch;
        if (!existing.has(childId)) {
          existing.add(childId);
          snap([childId], "create", `add node '${ch}'`);
        } else {
          snap([childId], "descend", `follow '${ch}'`);
        }
        curId = childId;
      }
      endNow.add(curId);
      snap([curId], "mark-end", `"${op.word}" is now a word`);
    } else {
      const verb = op.op === "search" ? "search" : "prefix";
      snap([""], "descend", `${verb} "${op.word}"`);
      let ok = true;
      for (const ch of op.word) {
        const childId = curId + ch;
        if (existing.has(childId)) {
          curId = childId;
          snap([childId], "descend", `match '${ch}'`);
        } else {
          ok = false;
          snap([curId], "miss", `no edge '${ch}' — "${op.word}" not present`);
          break;
        }
      }
      if (ok) {
        if (op.op === "prefix") {
          snap([curId], "hit", `prefix "${op.word}" present`);
        } else if (endNow.has(curId)) {
          snap([curId], "hit", `"${op.word}" found`);
        } else {
          snap([curId], "miss", `"${op.word}" is a prefix, not a stored word`);
        }
      }
    }
  }

  snap([], "settle", "done");
  return { layout, steps };
}
