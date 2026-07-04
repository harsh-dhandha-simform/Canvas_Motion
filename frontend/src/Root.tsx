/**
 * Root.tsx — Remotion entry point.
 * 
 * Maps all scripts found in `generated/examples.generated.ts` into individual
 * Remotion `<Composition>`s. This allows previewing and rendering any generated
 * script in the Remotion studio without code changes.
 */
import "./index.css";
import { Composition } from "remotion";
import { DynamicVideo, VideoScriptProps } from "./DynamicVideo";
import { EXAMPLE_SCRIPTS } from "./generated/examples.generated";
import { SortingVisualizer } from "./components/SortingVisualizer";
import { LinearStructure } from "./components/LinearStructure";
import { ArrayAlgorithm } from "./components/ArrayAlgorithm";
import { DPTableVisualizer } from "./components/DPTableVisualizer";
import { GraphTraversal } from "./components/GraphTraversal";
import { RecursionTree } from "./components/RecursionTree";
import { HeapVisualizer } from "./components/HeapVisualizer";
import { HashTable } from "./components/HashTable";
import { TrieVisualizer } from "./components/TrieVisualizer";
import { UnionFind } from "./components/UnionFind";
import { BSTOperations } from "./components/BSTOperations";
import { SegmentTree } from "./components/SegmentTree";
import { FenwickTree } from "./components/FenwickTree";
import { RedBlackTree } from "./components/RedBlackTree";
import { BTreeVisualizer } from "./components/BTreeVisualizer";
import { SkipList } from "./components/SkipList";
import { LRUCache } from "./components/LRUCache";
import { MonotonicStack } from "./components/MonotonicStack";
import { AStarPathfinding } from "./components/AStarPathfinding";
import { StringMatching } from "./components/StringMatching";
import { BacktrackingGrid } from "./components/BacktrackingGrid";
import { BloomFilter } from "./components/BloomFilter";
import { SieveOfEratosthenes } from "./components/SieveOfEratosthenes";
import { FlowNetwork } from "./components/FlowNetwork";
import { QuadTree } from "./components/QuadTree";
import { KDTree } from "./components/KDTree";
import { StronglyConnectedComponents } from "./components/StronglyConnectedComponents";
import { GraphColoring } from "./components/GraphColoring";
import { SuffixArray } from "./components/SuffixArray";
import { IntervalScheduling } from "./components/IntervalScheduling";
import { BitManipulation } from "./components/BitManipulation";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {Object.entries(EXAMPLE_SCRIPTS).map(([slug, script]) => {
        const totalFrames = script.scenes.reduce(
          (sum, s) => sum + s.duration_frames,
          0
        );
        return (
          <Composition
            key={slug}
            id={slug}
            component={DynamicVideo}
            durationInFrames={totalFrames}
            fps={script.fps}
            width={script.width}
            height={script.height}
            defaultProps={script as VideoScriptProps}
          />
        );
      })}

      <Composition
        id="preview-SortingVisualizer"
        component={SortingVisualizer}
        durationInFrames={30 * 15}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Bubble sort",
          algorithm: "bubble" as const,
          values: [8, 3, 5, 1, 7, 2, 6, 4],
          showComparisonCounter: true,
        }}
      />

      <Composition
        id="preview-LinearStructure"
        component={LinearStructure}
        durationInFrames={30 * 12}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Queue: enqueue / dequeue",
          kind: "queue" as const,
          initial: [1, 2, 3],
          operations: [
            { op: "enqueue" as const, value: 4 },
            { op: "enqueue" as const, value: 5 },
            { op: "dequeue" as const },
            { op: "dequeue" as const },
          ],
          showHeadTail: true,
        }}
      />
      <Composition
        id="preview-ArrayAlgorithm"
        component={ArrayAlgorithm}
        durationInFrames={30 * 10}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Binary search for 23",
          mode: "binary-search" as const,
          values: [3, 7, 11, 15, 19, 23, 27, 31, 35],
          target: 23,
        }}
      />

      <Composition
        id="preview-DPTableVisualizer"
        component={DPTableVisualizer}
        durationInFrames={30 * 15}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Fibonacci DP table",
          rows: 1,
          cols: 8,
          colLabels: ["0", "1", "2", "3", "4", "5", "6", "7"],
          fills: [
            { row: 0, col: 0, value: 0 },
            { row: 0, col: 1, value: 1 },
            { row: 0, col: 2, value: 1, dependsOn: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
            { row: 0, col: 3, value: 2, dependsOn: [{ row: 0, col: 1 }, { row: 0, col: 2 }] },
            { row: 0, col: 4, value: 3, dependsOn: [{ row: 0, col: 2 }, { row: 0, col: 3 }] },
            { row: 0, col: 5, value: 5, dependsOn: [{ row: 0, col: 3 }, { row: 0, col: 4 }] },
            { row: 0, col: 6, value: 8, dependsOn: [{ row: 0, col: 4 }, { row: 0, col: 5 }] },
            { row: 0, col: 7, value: 13, dependsOn: [{ row: 0, col: 5 }, { row: 0, col: 6 }] },
          ],
        }}
      />
      <Composition
        id="preview-GraphTraversal"
        component={GraphTraversal}
        durationInFrames={30 * 18}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Dijkstra from A",
          algorithm: "dijkstra" as const,
          nodes: [
            { id: "A", x: 15, y: 40 },
            { id: "B", x: 40, y: 20 },
            { id: "C", x: 40, y: 65 },
            { id: "D", x: 65, y: 40 },
            { id: "E", x: 85, y: 25 },
            { id: "F", x: 85, y: 60 },
          ],
          edges: [
            { from: "A", to: "B", weight: 4 },
            { from: "A", to: "C", weight: 2 },
            { from: "B", to: "C", weight: 1 },
            { from: "B", to: "D", weight: 5 },
            { from: "C", to: "D", weight: 8 },
            { from: "D", to: "E", weight: 2 },
            { from: "D", to: "F", weight: 6 },
            { from: "E", to: "F", weight: 3 },
          ],
          start: "A",
          showDistanceTable: true,
        }}
      />
      <Composition
        id="preview-RecursionTree"
        component={RecursionTree}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "fib(4) with memoisation",
          root: {
            label: "fib(4)",
            returns: 3,
            children: [
              {
                label: "fib(3)",
                returns: 2,
                children: [
                  {
                    label: "fib(2)",
                    returns: 1,
                    children: [
                      { label: "fib(1)", returns: 1 },
                      { label: "fib(0)", returns: 0 },
                    ],
                  },
                  { label: "fib(1)", returns: 1 },
                ],
              },
              { label: "fib(2)", returns: 1 },
            ],
          },
          showReturns: true,
          memoized: ["fib(2)"],
        }}
      />
      <Composition
        id="preview-HeapVisualizer"
        component={HeapVisualizer}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Min-heap",
          kind: "min" as const,
          initial: [5, 3, 8, 1, 9, 2],
          operations: [
            { op: "insert" as const, value: 0 },
            { op: "extract" as const },
          ],
          showArray: true,
        }}
      />
      <Composition
        id="preview-HashTable"
        component={HashTable}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Hash table",
          buckets: 7,
          strategy: "chaining" as const,
          operations: [
            { op: "insert" as const, key: "cat", value: "1" },
            { op: "insert" as const, key: "dog", value: "2" },
            { op: "insert" as const, key: "act", value: "3" },
            { op: "lookup" as const, key: "act" },
            { op: "lookup" as const, key: "fox" },
          ],
        }}
      />
      <Composition
        id="preview-TrieVisualizer"
        component={TrieVisualizer}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Trie",
          operations: [
            { op: "insert" as const, word: "cat" },
            { op: "insert" as const, word: "car" },
            { op: "insert" as const, word: "dog" },
            { op: "search" as const, word: "car" },
            { op: "search" as const, word: "cab" },
            { op: "prefix" as const, word: "ca" },
          ],
        }}
      />
      <Composition
        id="preview-UnionFind"
        component={UnionFind}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Union-Find",
          elements: ["A", "B", "C", "D", "E", "F"],
          operations: [
            { op: "union" as const, a: "A", b: "B" },
            { op: "union" as const, a: "C", b: "D" },
            { op: "union" as const, a: "B", b: "D" },
            { op: "find" as const, a: "C" },
          ],
        }}
      />
      <Composition
        id="preview-BSTOperations"
        component={BSTOperations}
        durationInFrames={30 * 24}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "AVL tree",
          initial: [10, 20, 30, 40, 50, 25],
          operations: [
            { op: "search" as const, value: 40 },
            { op: "delete" as const, value: 30 },
          ],
          balance: "avl" as const,
        }}
      />
      <Composition
        id="preview-SegmentTree"
        component={SegmentTree}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Segment tree",
          values: [2, 5, 1, 4, 9, 3, 7, 6],
          op: "sum" as const,
          operations: [
            { op: "query" as const, lo: 2, hi: 6 },
            { op: "update" as const, index: 4, value: 0 },
            { op: "query" as const, lo: 2, hi: 6 },
          ],
        }}
      />
      <Composition
        id="preview-FenwickTree"
        component={FenwickTree}
        durationInFrames={30 * 18}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Fenwick tree",
          values: [3, 2, 5, 1, 6, 4, 7, 2],
          operations: [
            { op: "prefixSum" as const, index: 5 },
            { op: "update" as const, index: 3, delta: 4 },
            { op: "prefixSum" as const, index: 5 },
          ],
        }}
      />
      <Composition
        id="preview-RedBlackTree"
        component={RedBlackTree}
        durationInFrames={30 * 24}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Red-black tree",
          values: [10, 20, 30, 15, 25, 5, 1],
        }}
      />
      <Composition
        id="preview-BTreeVisualizer"
        component={BTreeVisualizer}
        durationInFrames={30 * 24}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "B-tree",
          order: 3,
          values: [10, 20, 5, 6, 12, 30, 7, 17],
        }}
      />
      <Composition
        id="preview-SkipList"
        component={SkipList}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Skip list",
          maxLevel: 4,
          operations: [
            { op: "insert" as const, value: 3 },
            { op: "insert" as const, value: 7 },
            { op: "insert" as const, value: 9 },
            { op: "insert" as const, value: 12 },
            { op: "insert" as const, value: 15 },
            { op: "search" as const, value: 12 },
          ],
        }}
      />
      <Composition
        id="preview-LRUCache"
        component={LRUCache}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "LRU cache",
          capacity: 3,
          operations: [
            { op: "put" as const, key: "A", value: "1" },
            { op: "put" as const, key: "B", value: "2" },
            { op: "put" as const, key: "C", value: "3" },
            { op: "get" as const, key: "A" },
            { op: "put" as const, key: "D", value: "4" },
            { op: "get" as const, key: "B" },
          ],
        }}
      />
      <Composition
        id="preview-MonotonicStack"
        component={MonotonicStack}
        durationInFrames={30 * 18}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Monotonic stack",
          values: [2, 1, 5, 6, 2, 3],
          variant: "next-greater" as const,
        }}
      />
      <Composition
        id="preview-AStarPathfinding"
        component={AStarPathfinding}
        durationInFrames={30 * 26}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "A* pathfinding",
          rows: 6,
          cols: 8,
          walls: [[1, 3], [2, 3], [3, 3], [4, 3], [1, 5], [2, 5], [4, 5], [5, 5]] as [number, number][],
          start: [3, 1] as [number, number],
          goal: [2, 7] as [number, number],
          heuristic: "manhattan" as const,
        }}
      />
      <Composition
        id="preview-StringMatching"
        component={StringMatching}
        durationInFrames={30 * 26}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "String matching",
          text: "ABABDABACDABABCABAB",
          pattern: "ABABCABAB",
          algorithm: "kmp" as const,
        }}
      />
      <Composition
        id="preview-BacktrackingGrid"
        component={BacktrackingGrid}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "N-Queens backtracking",
          puzzle: "n-queens" as const,
          n: 6,
        }}
      />
      <Composition
        id="preview-BloomFilter"
        component={BloomFilter}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Bloom filter",
          size: 16,
          k: 3,
          operations: [
            { op: "insert" as const, key: "cat" },
            { op: "insert" as const, key: "dog" },
            { op: "query" as const, key: "cat" },
            { op: "query" as const, key: "fox" },
          ],
        }}
      />
      <Composition
        id="preview-SieveOfEratosthenes"
        component={SieveOfEratosthenes}
        durationInFrames={30 * 26}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "Sieve of Eratosthenes", n: 40, cols: 10 }}
      />
      <Composition
        id="preview-FlowNetwork"
        component={FlowNetwork}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Maximum flow",
          nodes: [
            { id: "s", x: 8, y: 50 },
            { id: "a", x: 35, y: 22 },
            { id: "b", x: 35, y: 78 },
            { id: "c", x: 65, y: 22 },
            { id: "d", x: 65, y: 78 },
            { id: "t", x: 92, y: 50 },
          ],
          edges: [
            { from: "s", to: "a", capacity: 10 },
            { from: "s", to: "b", capacity: 10 },
            { from: "a", to: "c", capacity: 9 },
            { from: "a", to: "b", capacity: 2 },
            { from: "b", to: "d", capacity: 8 },
            { from: "c", to: "t", capacity: 10 },
            { from: "d", to: "c", capacity: 6 },
            { from: "d", to: "t", capacity: 10 },
          ],
          source: "s",
          sink: "t",
        }}
      />
      <Composition
        id="preview-QuadTree"
        component={QuadTree}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Quadtree",
          capacity: 1,
          points: [
            { x: 0.2, y: 0.3 }, { x: 0.7, y: 0.2 }, { x: 0.8, y: 0.8 },
            { x: 0.3, y: 0.7 }, { x: 0.25, y: 0.35 }, { x: 0.6, y: 0.6 },
            { x: 0.85, y: 0.75 },
          ],
        }}
      />
      <Composition
        id="preview-KDTree"
        component={KDTree}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "k-d tree",
          points: [
            { x: 0.5, y: 0.5 }, { x: 0.25, y: 0.7 }, { x: 0.75, y: 0.3 },
            { x: 0.15, y: 0.35 }, { x: 0.6, y: 0.85 }, { x: 0.85, y: 0.6 },
          ],
        }}
      />
      <Composition
        id="preview-StronglyConnectedComponents"
        component={StronglyConnectedComponents}
        durationInFrames={30 * 26}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Strongly connected components",
          nodes: [
            { id: "A", x: 15, y: 30 },
            { id: "B", x: 40, y: 15 },
            { id: "C", x: 40, y: 55 },
            { id: "D", x: 68, y: 35 },
            { id: "E", x: 88, y: 20 },
            { id: "F", x: 88, y: 60 },
          ],
          edges: [
            { from: "A", to: "B" },
            { from: "B", to: "C" },
            { from: "C", to: "A" },
            { from: "B", to: "D" },
            { from: "D", to: "E" },
            { from: "E", to: "F" },
            { from: "F", to: "D" },
          ],
        }}
      />
      <Composition
        id="preview-GraphColoring"
        component={GraphColoring}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Greedy graph coloring",
          nodes: [
            { id: "A", x: 25, y: 25 },
            { id: "B", x: 65, y: 20 },
            { id: "C", x: 20, y: 70 },
            { id: "D", x: 55, y: 60 },
            { id: "E", x: 85, y: 65 },
          ],
          edges: [
            { from: "A", to: "B" },
            { from: "A", to: "C" },
            { from: "A", to: "D" },
            { from: "B", to: "D" },
            { from: "B", to: "E" },
            { from: "C", to: "D" },
            { from: "D", to: "E" },
          ],
        }}
      />
      <Composition
        id="preview-SuffixArray"
        component={SuffixArray}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "Suffix array", text: "banana", pattern: "ana" }}
      />
      <Composition
        id="preview-IntervalScheduling"
        component={IntervalScheduling}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Activity selection",
          intervals: [
            { start: 1, end: 4, label: "A" },
            { start: 3, end: 5, label: "B" },
            { start: 0, end: 6, label: "C" },
            { start: 5, end: 7, label: "D" },
            { start: 3, end: 9, label: "E" },
            { start: 8, end: 10, label: "F" },
          ],
        }}
      />
      <Composition
        id="preview-BitManipulation"
        component={BitManipulation}
        durationInFrames={30 * 22}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Bit manipulation",
          value: 45,
          width: 8,
          operations: [
            { op: "and" as const, mask: 30 },
            { op: "or" as const, mask: 3 },
            { op: "xor" as const, mask: 255 },
            { op: "shl" as const, by: 1 },
            { op: "popcount" as const },
          ],
        }}
      />
    </>
  );
};
