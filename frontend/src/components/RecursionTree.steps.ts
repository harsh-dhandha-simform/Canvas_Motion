import type { TreeNode } from "./RecursionTree";

export type FlatNode = {
  id: string;
  label: string;
  depth: number;
  x: number;     // 0-100 percentage
  y: number;     // 0-100 percentage
  parentId?: string;
  returns?: string | number;
  pruned?: boolean;
  memoized?: boolean;
};

/**
 * DFS pre-order flatten with tidy layout: level = depth, x = leaf order.
 * Memoization: nodes whose `label` appears in `memoized` are treated as
 * memo-hits ONLY on second and subsequent occurrences — the first occurrence
 * computes (and expands) normally. This matches how memoization actually works.
 */
export function flattenTree(
  root: TreeNode,
  memoized?: string[],
): FlatNode[] {
  const memo = new Set(memoized ?? []);
  const seenLabels = new Set<string>();
  const flat: FlatNode[] = [];
  let leafX = 0;
  let maxDepth = 0;

  function walk(
    node: TreeNode,
    depth: number,
    parentId: string | undefined,
    path: string,
  ): FlatNode {
    maxDepth = Math.max(maxDepth, depth);
    const id = path;
    const isMemoHit = memo.has(node.label) && seenLabels.has(node.label);
    seenLabels.add(node.label);
    const stopExpanding = isMemoHit || !!node.pruned;
    const children = stopExpanding ? [] : (node.children ?? []);

    const record: FlatNode = {
      id, label: node.label, depth,
      x: 0, y: 0,           // filled below
      parentId,
      returns: node.returns,
      pruned: node.pruned,
      memoized: isMemoHit,
    };
    flat.push(record);      // pre-order: parent first, then descendants

    if (children.length === 0) {
      record.x = leafX;
      leafX += 1;
    } else {
      const childRecords = children.map((c, i) =>
        walk(c, depth + 1, id, `${path}.${i}`)
      );
      record.x = (childRecords[0].x + childRecords[childRecords.length - 1].x) / 2;
    }
    return record;
  }

  walk(root, 0, undefined, "0");

  // Normalise x to 10-90%, y to 15-85% based on maxDepth.
  const totalLeaves = Math.max(1, leafX);
  const yStep = maxDepth === 0 ? 0 : 70 / maxDepth;
  return flat.map(n => ({
    ...n,
    x: 10 + (n.x / Math.max(1, totalLeaves - 1)) * 80,
    y: 15 + yStep * n.depth,
  }));
}
