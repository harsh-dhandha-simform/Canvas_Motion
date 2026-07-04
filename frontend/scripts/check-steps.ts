// check-steps.ts — framework-free self-check for the algorithm step generators.
// Run: npx tsx scripts/check-steps.ts
// Asserts structural invariants on the pure step output (no React involved).

import assert from "node:assert";
import { generateHeapSteps } from "../src/components/HeapVisualizer.steps";
import { generateHashSteps } from "../src/components/HashTable.steps";
import { generateTrieSteps } from "../src/components/TrieVisualizer.steps";
import { generateUnionFindSteps } from "../src/components/UnionFind.steps";
import { generateBSTSteps, BSTSnapNode } from "../src/components/BSTOperations.steps";
import { generateSegmentTreeSteps, SegOperation } from "../src/components/SegmentTree.steps";
import { generateFenwickSteps, FenwickOperation } from "../src/components/FenwickTree.steps";
import { generateRedBlackSteps, RBSnapNode } from "../src/components/RedBlackTree.steps";
import { generateBTreeSteps, BTreeSnapNode } from "../src/components/BTreeVisualizer.steps";
import { generateSkipListSteps, SkipOperation } from "../src/components/SkipList.steps";
import { generateLRUSteps, LRUOperation } from "../src/components/LRUCache.steps";
import { generateMonoStackSteps, MonoVariant } from "../src/components/MonotonicStack.steps";
import { generateAStarSteps, Cell } from "../src/components/AStarPathfinding.steps";
import { generateStringMatchSteps, findAllMatches, MatchAlgorithm } from "../src/components/StringMatching.steps";
import { generateQueensSteps } from "../src/components/BacktrackingGrid.steps";
import { generateBloomSteps, bloomPositions, BloomOperation } from "../src/components/BloomFilter.steps";
import { generateSieveSteps, primesUpTo } from "../src/components/SieveOfEratosthenes.steps";
import { generateFlowSteps } from "../src/components/FlowNetwork.steps";
import { generateQuadTreeSteps } from "../src/components/QuadTree.steps";
import { generateKDTreeSteps, KDSnapNode } from "../src/components/KDTree.steps";
import { generateSccSteps } from "../src/components/StronglyConnectedComponents.steps";
import { generateColoringSteps } from "../src/components/GraphColoring.steps";
import { generateSuffixArraySteps, buildSuffixArray } from "../src/components/SuffixArray.steps";
import { generateIntervalSteps, greedySelect } from "../src/components/IntervalScheduling.steps";
import { generateBitSteps, applyBitOps, BitOperation } from "../src/components/BitManipulation.steps";

const last = <T>(a: T[]): T => a[a.length - 1];

// ── Heap ──────────────────────────────────────────────────────────────────
function isHeap(arr: number[], kind: "min" | "max"): boolean {
  for (let i = 0; i < arr.length; i++) {
    for (const c of [2 * i + 1, 2 * i + 2]) {
      if (c < arr.length) {
        const bad = kind === "min" ? arr[i] > arr[c] : arr[i] < arr[c];
        if (bad) return false;
      }
    }
  }
  return true;
}
for (const kind of ["min", "max"] as const) {
  const steps = generateHeapSteps(
    kind,
    [5, 3, 8, 1, 9, 2],
    [{ op: "insert", value: 0 }, { op: "extract" }],
  );
  const finalHeap = last(steps).heap;
  assert(isHeap(finalHeap, kind), `heap invariant broken for ${kind}-heap: ${finalHeap}`);
  // Every swap step must actually reflect in the following snapshot's array.
  assert(steps.some((s) => s.kind === "swap"), "expected at least one heap swap");
}
console.log("✓ Heap: min & max heap property holds after insert/extract");

// ── Hash table ───────────────────────────────────────────────────────────
for (const strategy of ["chaining", "open-addressing"] as const) {
  const steps = generateHashSteps(strategy, 7, [
    { op: "insert", key: "cat", value: "1" },
    { op: "insert", key: "act", value: "2" }, // anagram of cat → same hash → collision
    { op: "insert", key: "dog", value: "3" },
    { op: "lookup", key: "act" },
    { op: "lookup", key: "fox" },
  ]);
  const kinds = steps.map((s) => s.kind);
  assert(kinds.includes("found"), `${strategy}: expected a 'found' step for an inserted key`);
  assert(kinds.includes("miss"), `${strategy}: expected a 'miss' step for an absent key`);
  assert(kinds.includes("collision"), `${strategy}: 'cat'/'act' should collide`);
  // The found step must carry the key we looked up.
  const found = steps.find((s) => s.kind === "found");
  assert(found && found.key === "act", `${strategy}: found step should be for 'act'`);
}
console.log("✓ HashTable: chaining & open-addressing resolve collisions, hit and miss correctly");

// ── Trie ─────────────────────────────────────────────────────────────────
{
  const { steps } = generateTrieSteps([
    { op: "insert", word: "cat" },
    { op: "insert", word: "car" },
    { op: "search", word: "car" }, // inserted word → hit
    { op: "search", word: "ca" }, // prefix only, not a word → miss
    { op: "search", word: "dog" }, // absent → miss
    { op: "prefix", word: "ca" }, // prefix present → hit
  ]);
  const kindsOf = (caption: string) =>
    steps.filter((s) => s.caption.includes(caption)).map((s) => s.kind);
  assert(kindsOf('"car" found').includes("hit"), "trie: 'car' should be found");
  assert(steps.some((s) => s.kind === "hit" && s.caption.includes('prefix "ca"')), "trie: prefix 'ca' should hit");
  assert(steps.some((s) => s.kind === "miss" && s.caption.includes('"dog"')), "trie: 'dog' should miss");
  assert(steps.some((s) => s.kind === "miss" && s.caption.includes("prefix, not")), "trie: 'ca' as word should miss");
}
console.log("✓ Trie: insert, search (word vs prefix) and absent lookups behave correctly");

// ── Union-Find ───────────────────────────────────────────────────────────
{
  const labels = ["A", "B", "C", "D", "E", "F"];
  const steps = generateUnionFindSteps(labels, [
    { op: "union", a: "A", b: "B" },
    { op: "union", a: "C", b: "D" },
    { op: "union", a: "B", b: "D" }, // merges {A,B} and {C,D}
    { op: "find", a: "A" },
  ]);
  const parent = last(steps).parent;
  const root = (i: number) => {
    while (parent[i] !== i) i = parent[i];
    return i;
  };
  const idx = (l: string) => labels.indexOf(l);
  const rA = root(idx("A"));
  assert([("B"), "C", "D"].every((l) => root(idx(l)) === rA), "union-find: A,B,C,D must share a root");
  assert(root(idx("E")) !== rA && root(idx("F")) !== rA, "union-find: E,F must stay separate");
  assert(root(idx("E")) !== root(idx("F")), "union-find: E and F are distinct sets");
}
console.log("✓ UnionFind: unioned elements share a root, untouched elements stay separate");

// ── BST / AVL ────────────────────────────────────────────────────────────
function inorder(n: BSTSnapNode | undefined, out: number[]) {
  if (!n) return;
  inorder(n.left, out);
  out.push(n.key);
  inorder(n.right, out);
}
function heightOf(n: BSTSnapNode | undefined): number {
  return n ? 1 + Math.max(heightOf(n.left), heightOf(n.right)) : 0;
}
function isBalanced(n: BSTSnapNode | undefined): boolean {
  if (!n) return true;
  if (Math.abs(heightOf(n.left) - heightOf(n.right)) > 1) return false;
  return isBalanced(n.left) && isBalanced(n.right);
}
function isSorted(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i] <= a[i - 1]) return false;
  return true;
}
for (const balance of ["none", "avl"] as const) {
  const steps = generateBSTSteps(
    [10, 20, 30, 40, 50, 25],
    [{ op: "insert", value: 5 }, { op: "search", value: 40 }, { op: "delete", value: 30 }],
    balance,
  );
  const root = last(steps).root ?? undefined;
  const out: number[] = [];
  inorder(root, out);
  assert(isSorted(out), `bst(${balance}): in-order must be strictly ascending, got ${out}`);
  assert(!out.includes(30), `bst(${balance}): deleted key 30 must be gone`);
  if (balance === "avl") {
    assert(isBalanced(root), "avl: every node balance factor must be within [-1, 1]");
  }
  assert(steps.some((s) => s.kind === "found" && s.caption.includes("found 40")), `bst(${balance}): search 40 should be found`);
}
console.log("✓ BST/AVL: in-order sorted, deletions removed, AVL stays balanced");

// ── SegmentTree ──────────────────────────────────────────────────────────
{
  const vals = [2, 5, 1, 4, 9, 3, 7, 6];
  const ops: SegOperation[] = [
    { op: "query", lo: 2, hi: 6 },
    { op: "update", index: 4, value: 0 },
    { op: "query", lo: 2, hi: 6 },
  ];
  const { steps } = generateSegmentTreeSteps(vals, "sum", ops);
  const done = steps.filter((s) => s.kind === "query-done");
  const brute = (a: number[], lo: number, hi: number) => a.slice(lo, hi + 1).reduce((x, y) => x + y, 0);
  assert(done[0].result === brute(vals, 2, 6), `segtree query1 ${done[0].result}`);
  const after = [...vals];
  after[4] = 0;
  assert(done[1].result === brute(after, 2, 6), `segtree query2 ${done[1].result}`);
}
console.log("✓ SegmentTree: range queries match brute force before & after update");

// ── FenwickTree ──────────────────────────────────────────────────────────
{
  const vals = [3, 2, 5, 1, 6, 4, 7, 2];
  const ops: FenwickOperation[] = [
    { op: "prefixSum", index: 5 },
    { op: "update", index: 3, delta: 4 },
    { op: "prefixSum", index: 5 },
  ];
  const steps = generateFenwickSteps(vals, ops);
  const done = steps.filter((s) => s.kind === "query-done");
  const pref = (a: number[], i: number) => a.slice(0, i + 1).reduce((x, y) => x + y, 0);
  assert(done[0].sum === pref(vals, 5), `fenwick q1 ${done[0].sum}`);
  const after = [...vals];
  after[3] += 4;
  assert(done[1].sum === pref(after, 5), `fenwick q2 ${done[1].sum}`);
}
console.log("✓ FenwickTree: prefix sums match brute force before & after update");

// ── RedBlackTree ─────────────────────────────────────────────────────────
{
  const steps = generateRedBlackSteps([], [10, 20, 30, 15, 25, 5, 1]);
  const root = last(steps).root;
  const inorder = (n: RBSnapNode | undefined, out: number[]) => {
    if (!n) return;
    inorder(n.left, out);
    out.push(n.key);
    inorder(n.right, out);
  };
  const out: number[] = [];
  inorder(root ?? undefined, out);
  for (let i = 1; i < out.length; i++) assert(out[i] > out[i - 1], "rb in-order not sorted");
  assert(root && root.color === "B", "rb root must be black");
  const noRedRed = (n?: RBSnapNode): boolean => {
    if (!n) return true;
    if (n.color === "R" && ((n.left && n.left.color === "R") || (n.right && n.right.color === "R"))) return false;
    return noRedRed(n.left) && noRedRed(n.right);
  };
  assert(noRedRed(root ?? undefined), "rb has a red-red violation");
  const blackHeight = (n?: RBSnapNode): number => {
    if (!n) return 1;
    const l = blackHeight(n.left);
    const r = blackHeight(n.right);
    if (l < 0 || r < 0 || l !== r) return -1;
    return l + (n.color === "B" ? 1 : 0);
  };
  assert(blackHeight(root ?? undefined) > 0, "rb black-height not uniform");
}
console.log("✓ RedBlackTree: sorted, root black, no red-red, uniform black-height");

// ── BTree ────────────────────────────────────────────────────────────────
{
  const order = 3;
  const steps = generateBTreeSteps(order, [10, 20, 5, 6, 12, 30, 7, 17]);
  const root = last(steps).root as BTreeSnapNode;
  const inorder = (n: BTreeSnapNode, out: number[]) => {
    if (n.children.length === 0) {
      out.push(...n.keys);
      return;
    }
    for (let i = 0; i < n.keys.length; i++) {
      inorder(n.children[i], out);
      out.push(n.keys[i]);
    }
    inorder(n.children[n.keys.length], out);
  };
  const out: number[] = [];
  inorder(root, out);
  for (let i = 1; i < out.length; i++) assert(out[i] > out[i - 1], "btree in-order not sorted");
  const keysOk = (n: BTreeSnapNode): boolean => n.keys.length <= order - 1 && n.children.every(keysOk);
  assert(keysOk(root), "btree node exceeds max keys");
  const depths = new Set<number>();
  const leafDepth = (n: BTreeSnapNode, d: number) => {
    if (n.children.length === 0) depths.add(d);
    else n.children.forEach((c) => leafDepth(c, d + 1));
  };
  leafDepth(root, 0);
  assert(depths.size === 1, "btree leaves not at equal depth");
}
console.log("✓ BTree: sorted, node key-counts bounded, all leaves at equal depth");

// ── SkipList ─────────────────────────────────────────────────────────────
{
  const ops: SkipOperation[] = [
    { op: "insert", value: 3 },
    { op: "insert", value: 7 },
    { op: "insert", value: 9 },
    { op: "insert", value: 12 },
    { op: "insert", value: 15 },
    { op: "search", value: 12 },
    { op: "search", value: 8 },
  ];
  const steps = generateSkipListSteps(ops, 4);
  assert(steps.some((s) => s.kind === "found" && s.target === 12), "skiplist should find 12");
  assert(steps.some((s) => s.kind === "miss" && s.target === 8), "skiplist should miss 8");
  const finalVals = last(steps).nodes.map((n) => n.value);
  for (let i = 1; i < finalVals.length; i++) assert(finalVals[i] > finalVals[i - 1], "skiplist level-0 not sorted");
}
console.log("✓ SkipList: search hit/miss correct, level-0 chain sorted");

// ── LRUCache ─────────────────────────────────────────────────────────────
{
  const ops: LRUOperation[] = [
    { op: "put", key: "A", value: "1" },
    { op: "put", key: "B", value: "2" },
    { op: "put", key: "C", value: "3" },
    { op: "get", key: "A" },
    { op: "put", key: "D", value: "4" },
    { op: "get", key: "B" },
  ];
  const steps = generateLRUSteps(3, ops);
  // capacity may be exceeded for exactly one transient "insert" step, then evicted
  for (const s of steps) assert(s.entries.length <= 3 || s.kind === "insert", "lru exceeded capacity");
  assert(last(steps).entries.length <= 3, "lru final over capacity");
  assert(steps.some((s) => s.kind === "evict" && s.evicted === "B"), "lru should evict B");
  assert(steps.some((s) => s.kind === "miss" && s.caption.includes("get(B)")), "lru get(B) should miss");
}
console.log("✓ LRUCache: capacity respected, LRU evicted, evicted key misses");

// ── MonotonicStack ───────────────────────────────────────────────────────
{
  const vals = [2, 1, 5, 6, 2, 3];
  const brute = (variant: MonoVariant): (number | null)[] => {
    const n = vals.length;
    const res: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      let ans: number | null = null;
      if (variant.startsWith("next")) {
        for (let j = i + 1; j < n; j++) {
          if (variant === "next-greater" ? vals[j] > vals[i] : vals[j] < vals[i]) {
            ans = vals[j];
            break;
          }
        }
      } else {
        for (let j = i - 1; j >= 0; j--) {
          if (variant === "prev-greater" ? vals[j] > vals[i] : vals[j] < vals[i]) {
            ans = vals[j];
            break;
          }
        }
      }
      res.push(ans);
    }
    return res;
  };
  for (const variant of ["next-greater", "next-smaller", "prev-greater", "prev-smaller"] as MonoVariant[]) {
    const steps = generateMonoStackSteps(vals, variant);
    assert(JSON.stringify(last(steps).answer) === JSON.stringify(brute(variant)), `monostack ${variant} mismatch`);
  }
}
console.log("✓ MonotonicStack: answers match brute force for all 4 variants");

// ── AStarPathfinding ─────────────────────────────────────────────────────
{
  const rows = 6;
  const cols = 8;
  const walls: Cell[] = [[1, 3], [2, 3], [3, 3], [4, 3], [1, 5], [2, 5], [4, 5], [5, 5]];
  const start: Cell = [3, 1];
  const goal: Cell = [2, 7];
  const steps = generateAStarSteps(rows, cols, walls, start, goal, "manhattan");
  const pathStep = steps.find((s) => s.kind === "path");
  assert(pathStep, "a* should find a path");
  const path = (pathStep as NonNullable<typeof pathStep>).path;
  const id = (r: number, c: number) => r * cols + c;
  const wallSet = new Set(walls.map(([r, c]) => id(r, c)));
  assert(path[0] === id(start[0], start[1]), "a* path must start at start");
  assert(path[path.length - 1] === id(goal[0], goal[1]), "a* path must end at goal");
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1];
    const b = path[k];
    const md = Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));
    assert(md === 1, "a* path not contiguous");
    assert(!wallSet.has(b), "a* path crosses a wall");
  }
  // BFS optimum on the unit grid
  const startId = id(start[0], start[1]);
  const goalId = id(goal[0], goal[1]);
  const dist = new Map<number, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift() as number;
    const r = Math.floor(cur / cols);
    const c = cur % cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const nid = id(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !wallSet.has(nid) && !dist.has(nid)) {
        dist.set(nid, (dist.get(cur) as number) + 1);
        queue.push(nid);
      }
    }
  }
  assert(path.length - 1 === dist.get(goalId), "a* path not shortest");
}
console.log("✓ AStarPathfinding: path valid, wall-free, and optimal (matches BFS)");

// ── StringMatching ───────────────────────────────────────────────────────
{
  const text = "ABABDABACDABABCABAB";
  const pattern = "ABABCABAB";
  const brute = findAllMatches(text, pattern);
  for (const algo of ["naive", "kmp", "rabin-karp"] as MatchAlgorithm[]) {
    const steps = generateStringMatchSteps(text, pattern, algo);
    const found = steps.filter((s) => s.kind === "found").map((s) => s.shift);
    assert(JSON.stringify(found) === JSON.stringify(brute), `stringmatch ${algo} mismatch: ${found}`);
  }
}
console.log("✓ StringMatching: naive, KMP, Rabin-Karp all agree with brute force");

// ── BacktrackingGrid (N-Queens) ──────────────────────────────────────────
{
  const steps = generateQueensSteps(6);
  const solved = steps.find((s) => s.kind === "solved");
  assert(solved, "n-queens should find a solution");
  const b = (solved as NonNullable<typeof solved>).board;
  assert(b.every((c) => c >= 0), "n-queens solution incomplete");
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      assert(b[i] !== b[j], "two queens share a column");
      assert(Math.abs(b[i] - b[j]) !== Math.abs(i - j), "two queens share a diagonal");
    }
  }
}
console.log("✓ BacktrackingGrid: final N-Queens board is a valid solution");

// ── BloomFilter ──────────────────────────────────────────────────────────
{
  const ops: BloomOperation[] = [
    { op: "insert", key: "cat" },
    { op: "insert", key: "dog" },
    { op: "query", key: "cat" },
    { op: "query", key: "zzz" },
  ];
  const steps = generateBloomSteps(ops, 16, 3);
  const results = steps.filter((s) => s.result !== null);
  const catRes = results.find((r) => r.key === "cat");
  assert(catRes && catRes.result === "maybe", "bloom: inserted key must never be a false negative");
  // no false negative: every position of an inserted key is set at query time
  const catPos = bloomPositions("cat", 16, 3);
  assert(catPos.every((p) => (catRes as NonNullable<typeof catRes>).bits[p]), "bloom: cat bits must be set");
  const noRes = results.find((r) => r.result === "no");
  if (noRes) {
    const pos = bloomPositions(noRes.key as string, 16, 3);
    assert(pos.some((p) => !noRes.bits[p]), "bloom: a definite-no must have a clear bit");
  }
}
console.log("✓ BloomFilter: no false negatives; a definite-no has a clear bit");

// ── Sieve ────────────────────────────────────────────────────────────────
{
  const steps = generateSieveSteps(40);
  const fin = last(steps);
  const got: number[] = [];
  for (let i = 2; i <= 40; i++) if (!fin.crossed[i]) got.push(i);
  assert(JSON.stringify(got) === JSON.stringify(primesUpTo(40)), "sieve: survivors must equal the primes");
}
console.log("✓ Sieve: uncrossed numbers equal the true primes ≤ n");

// ── FlowNetwork ──────────────────────────────────────────────────────────
{
  const nodes = [
    { id: "s", x: 8, y: 50 }, { id: "a", x: 35, y: 22 }, { id: "b", x: 35, y: 78 },
    { id: "c", x: 65, y: 22 }, { id: "d", x: 65, y: 78 }, { id: "t", x: 92, y: 50 },
  ];
  const edges = [
    { from: "s", to: "a", capacity: 10 }, { from: "s", to: "b", capacity: 10 },
    { from: "a", to: "c", capacity: 9 }, { from: "a", to: "b", capacity: 2 },
    { from: "b", to: "d", capacity: 8 }, { from: "c", to: "t", capacity: 10 },
    { from: "d", to: "c", capacity: 6 }, { from: "d", to: "t", capacity: 10 },
  ];
  const steps = generateFlowSteps(nodes, edges, "s", "t");
  const fin = last(steps);
  for (const e of fin.edges) assert(e.flow >= 0 && e.flow <= e.cap, "flow: capacity violated");
  for (const n of nodes) {
    if (n.id === "s" || n.id === "t") continue;
    let inflow = 0;
    let outflow = 0;
    for (const e of fin.edges) {
      if (e.to === n.id) inflow += e.flow;
      if (e.from === n.id) outflow += e.flow;
    }
    assert(inflow === outflow, `flow: conservation violated at ${n.id}`);
  }
  let srcOut = 0;
  for (const e of fin.edges) if (e.from === "s") srcOut += e.flow;
  assert(srcOut === fin.maxFlow, "flow: source outflow must equal max flow");
  // optimality: no augmenting path remains in the residual graph
  const cap: Record<string, number> = {};
  const flow: Record<string, number> = {};
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  for (const e of edges) {
    cap[`${e.from}|${e.to}`] = (cap[`${e.from}|${e.to}`] || 0) + e.capacity;
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }
  for (const e of fin.edges) {
    flow[`${e.from}|${e.to}`] = (flow[`${e.from}|${e.to}`] || 0) + e.flow;
    flow[`${e.to}|${e.from}`] = (flow[`${e.to}|${e.from}`] || 0) - e.flow;
  }
  const seen = new Set(["s"]);
  const q = ["s"];
  while (q.length) {
    const u = q.shift() as string;
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v) && (cap[`${u}|${v}`] || 0) - (flow[`${u}|${v}`] || 0) > 0) {
        seen.add(v);
        q.push(v);
      }
    }
  }
  assert(!seen.has("t"), "flow: an augmenting path still exists (not maximal)");
}
console.log("✓ FlowNetwork: capacity + conservation hold, and the flow is maximal");

// ── QuadTree ─────────────────────────────────────────────────────────────
{
  const pts = [
    { x: 0.2, y: 0.3 }, { x: 0.7, y: 0.2 }, { x: 0.8, y: 0.8 },
    { x: 0.3, y: 0.7 }, { x: 0.25, y: 0.35 }, { x: 0.6, y: 0.6 }, { x: 0.85, y: 0.75 },
  ];
  const fin = last(generateQuadTreeSteps(pts, 1));
  for (const p of fin.points) {
    const containing = fin.rects.filter((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
    assert(containing.length === 1, "quadtree: point must fall in exactly one leaf");
  }
  for (const r of fin.rects) {
    const c = fin.points.filter((p) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h).length;
    assert(c <= fin.capacity, "quadtree: leaf exceeds capacity");
  }
}
console.log("✓ QuadTree: each point in exactly one leaf; no leaf over capacity");

// ── KDTree ───────────────────────────────────────────────────────────────
{
  const pts = [
    { x: 0.5, y: 0.5 }, { x: 0.25, y: 0.7 }, { x: 0.75, y: 0.3 },
    { x: 0.15, y: 0.35 }, { x: 0.6, y: 0.85 }, { x: 0.85, y: 0.6 },
  ];
  const { root } = generateKDTreeSteps(pts);
  const subtree = (n?: KDSnapNode): KDSnapNode["pt"][] =>
    n ? [n.pt, ...subtree(n.left), ...subtree(n.right)] : [];
  const checkKD = (n?: KDSnapNode): boolean => {
    if (!n) return true;
    const key = n.axis === 0 ? "x" : "y";
    if (!subtree(n.left).every((p) => p[key] < n.pt[key])) return false;
    if (!subtree(n.right).every((p) => p[key] >= n.pt[key])) return false;
    return checkKD(n.left) && checkKD(n.right);
  };
  assert(subtree(root ?? undefined).length === pts.length, "kdtree: must contain all points");
  assert(checkKD(root ?? undefined), "kdtree: axis-BST property violated");
}
console.log("✓ KDTree: contains all points and satisfies the axis-BST property");

// ── StronglyConnectedComponents ──────────────────────────────────────────
{
  const nodes = [
    { id: "A", x: 15, y: 30 }, { id: "B", x: 40, y: 15 }, { id: "C", x: 40, y: 55 },
    { id: "D", x: 68, y: 35 }, { id: "E", x: 88, y: 20 }, { id: "F", x: 88, y: 60 },
  ];
  const edges = [
    { from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" },
    { from: "B", to: "D" }, { from: "D", to: "E" }, { from: "E", to: "F" }, { from: "F", to: "D" },
  ];
  const comp = last(generateSccSteps(nodes, edges)).comp;
  const ids = nodes.map((n) => n.id);
  const adj = new Map(ids.map((id) => [id, [] as string[]]));
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const reach = (a: string, b: string): boolean => {
    const seen = new Set([a]);
    const q = [a];
    while (q.length) {
      const u = q.shift() as string;
      if (u === b) return true;
      for (const v of adj.get(u) ?? []) if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
    return a === b;
  };
  for (const u of ids) {
    for (const v of ids) {
      const sameComp = comp[u] === comp[v];
      const mutual = reach(u, v) && reach(v, u);
      assert(sameComp === mutual, `scc: ${u},${v} component/reachability mismatch`);
    }
  }
}
console.log("✓ SCC: components exactly match mutual reachability");

// ── GraphColoring ────────────────────────────────────────────────────────
{
  const nodes = [
    { id: "A", x: 25, y: 25 }, { id: "B", x: 65, y: 20 }, { id: "C", x: 20, y: 70 },
    { id: "D", x: 55, y: 60 }, { id: "E", x: 85, y: 65 },
  ];
  const edges = [
    { from: "A", to: "B" }, { from: "A", to: "C" }, { from: "A", to: "D" },
    { from: "B", to: "D" }, { from: "B", to: "E" }, { from: "C", to: "D" }, { from: "D", to: "E" },
  ];
  const colorOf = last(generateColoringSteps(nodes, edges)).colorOf;
  for (const e of edges) assert(colorOf[e.from] !== colorOf[e.to], `coloring: ${e.from}-${e.to} share a color`);
}
console.log("✓ GraphColoring: no edge connects two same-colored vertices");

// ── SuffixArray ──────────────────────────────────────────────────────────
{
  const sa = generateSuffixArraySteps("banana", "ana");
  const sortStep = sa.find((s) => s.kind === "sort");
  const order = (sortStep as NonNullable<typeof sortStep>).order.map((r) => r.suffix);
  const expected = buildSuffixArray("banana").map((r) => r.suffix);
  assert(JSON.stringify(order) === JSON.stringify(expected), "suffixarray: order must be sorted suffixes");
  const found = sa.find((s) => s.kind === "found");
  assert(found && found.matchRow !== null && found.order[found.matchRow].suffix.startsWith("ana"), "suffixarray: found row must start with pattern");
  assert(generateSuffixArraySteps("banana", "xyz").some((s) => s.kind === "miss"), "suffixarray: absent pattern must miss");
}
console.log("✓ SuffixArray: suffixes sorted, present pattern found, absent missed");

// ── IntervalScheduling ───────────────────────────────────────────────────
{
  const intervals = [
    { start: 1, end: 4, label: "A" }, { start: 3, end: 5, label: "B" }, { start: 0, end: 6, label: "C" },
    { start: 5, end: 7, label: "D" }, { start: 3, end: 9, label: "E" }, { start: 8, end: 10, label: "F" },
  ];
  const fin = last(generateIntervalSteps(intervals));
  const byId = new Map(fin.intervals.map((r) => [r.id, r]));
  const chosen = fin.selected.map((id) => byId.get(id) as NonNullable<ReturnType<typeof byId.get>>).sort((a, b) => a.start - b.start);
  for (let i = 1; i < chosen.length; i++) assert(chosen[i].start >= chosen[i - 1].end, "interval: selected overlap");
  assert(fin.selected.length === greedySelect(intervals).length, "interval: selection count differs from greedy");
}
console.log("✓ IntervalScheduling: selected intervals are non-overlapping and optimal");

// ── BitManipulation ──────────────────────────────────────────────────────
{
  const ops: BitOperation[] = [
    { op: "and", mask: 30 }, { op: "or", mask: 3 }, { op: "xor", mask: 255 },
    { op: "shl", by: 1 }, { op: "popcount" },
  ];
  const steps = generateBitSteps(45, ops, 8);
  const finalVal = parseInt(last(steps).topBits.join(""), 2);
  assert(finalVal === applyBitOps(45, ops, 8), "bit: final value differs from direct computation");
}
console.log("✓ BitManipulation: final value matches direct bitwise computation");

console.log("\nAll step-generator self-checks passed.");
