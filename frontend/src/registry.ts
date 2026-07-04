/**
 * src/registry.ts
 *
 * Maps scene type names (as produced by the backend JSON) to the actual
 * imported React components. 
 * 
 * Checklist for adding a new component:
 * 1. Build the component in `src/components/` and export its React component and Zod schema.
 * 2. Import it here and add it to `COMPONENT_REGISTRY` and `COMPONENT_SCHEMAS`.
 * 3. Add its `ComponentMeta` to `COMPONENT_META` (used by backend Planner agents).
 * 4. Add its `description` and `schema` to `COMPONENT_CATALOG` (used by backend Assembler agent).
 */

import { AnimatedTitle, AnimatedTitleSchema } from "./components/AnimatedTitle";
import { ComparisonCard, ComparisonCardSchema } from "./components/ComparisonCard";
import { BulletList, BulletListSchema } from "./components/BulletList";
import { StepFlow, StepFlowSchema } from "./components/StepFlow";
import { StatCallout, StatCalloutSchema } from "./components/StatCallout";
import { ArchitectureDiagram, ArchitectureDiagramSchema } from "./components/ArchitectureDiagram";
import { SplitScreen, SplitScreenSchema } from "./components/SplitScreen";
import { TypewriterText, TypewriterTextSchema } from "./components/TypewriterText";
import { TimelineFlow, TimelineFlowSchema } from "./components/TimelineFlow";
import { QuoteCard, QuoteCardSchema } from "./components/QuoteCard";
import { CodeBlock, CodeBlockSchema } from "./components/CodeBlock";
import { TwoColumnLayout, TwoColumnLayoutSchema } from "./components/TwoColumnLayout";
import { BarChart, BarChartSchema } from "./components/BarChart";
import { PacketFlow, PacketFlowSchema } from "./components/PacketFlow";
import { HttpExchange, HttpExchangeSchema } from "./components/HttpExchange";
import { HashRing, HashRingSchema } from "./components/HashRing";
import { StateMachine, StateMachineSchema } from "./components/StateMachine";
import { TreeHierarchy, TreeHierarchySchema } from "./components/TreeHierarchy";
import { SequenceDiagram, SequenceDiagramSchema } from "./components/SequenceDiagram";
import { LineChart, LineChartSchema } from "./components/LineChart";
import { MathFormula, MathFormulaSchema } from "./components/MathFormula";
import { EquationDerivation, EquationDerivationSchema } from "./components/EquationDerivation";
import { TerminalCLI, TerminalCLISchema } from "./components/TerminalCLI";
import { PieChart, PieChartSchema } from "./components/PieChart";
import { NumberedList, NumberedListSchema } from "./components/NumberedList";
import { GlossaryCards, GlossaryCardsSchema } from "./components/GlossaryCards";
import { FlowDiagram, FlowDiagramSchema } from "./components/FlowDiagram";
import { CalloutAnnotation, CalloutAnnotationSchema } from "./components/CalloutAnnotation";
import { SortingVisualizer, SortingVisualizerSchema } from "./components/SortingVisualizer";
import { LinearStructure, LinearStructureSchema } from "./components/LinearStructure";
import { ArrayAlgorithm, ArrayAlgorithmSchema } from "./components/ArrayAlgorithm";
import { DPTableVisualizer, DPTableVisualizerSchema } from "./components/DPTableVisualizer";
import { GraphTraversal, GraphTraversalSchema } from "./components/GraphTraversal";
import { RecursionTree, RecursionTreeSchema } from "./components/RecursionTree";
import { HeapVisualizer, HeapVisualizerSchema } from "./components/HeapVisualizer";
import { HashTable, HashTableSchema } from "./components/HashTable";
import { TrieVisualizer, TrieVisualizerSchema } from "./components/TrieVisualizer";
import { UnionFind, UnionFindSchema } from "./components/UnionFind";
import { BSTOperations, BSTOperationsSchema } from "./components/BSTOperations";
import { SegmentTree, SegmentTreeSchema } from "./components/SegmentTree";
import { FenwickTree, FenwickTreeSchema } from "./components/FenwickTree";
import { RedBlackTree, RedBlackTreeSchema } from "./components/RedBlackTree";
import { BTreeVisualizer, BTreeVisualizerSchema } from "./components/BTreeVisualizer";
import { SkipList, SkipListSchema } from "./components/SkipList";
import { LRUCache, LRUCacheSchema } from "./components/LRUCache";
import { MonotonicStack, MonotonicStackSchema } from "./components/MonotonicStack";
import { AStarPathfinding, AStarPathfindingSchema } from "./components/AStarPathfinding";
import { StringMatching, StringMatchingSchema } from "./components/StringMatching";
import { BacktrackingGrid, BacktrackingGridSchema } from "./components/BacktrackingGrid";
import { BloomFilter, BloomFilterSchema } from "./components/BloomFilter";
import { SieveOfEratosthenes, SieveOfEratosthenesSchema } from "./components/SieveOfEratosthenes";
import { FlowNetwork, FlowNetworkSchema } from "./components/FlowNetwork";
import { QuadTree, QuadTreeSchema } from "./components/QuadTree";
import { KDTree, KDTreeSchema } from "./components/KDTree";
import { StronglyConnectedComponents, StronglyConnectedComponentsSchema } from "./components/StronglyConnectedComponents";
import { GraphColoring, GraphColoringSchema } from "./components/GraphColoring";
import { SuffixArray, SuffixArraySchema } from "./components/SuffixArray";
import { IntervalScheduling, IntervalSchedulingSchema } from "./components/IntervalScheduling";
import { BitManipulation, BitManipulationSchema } from "./components/BitManipulation";

export const COMPONENT_REGISTRY = {
  AnimatedTitle,
  ComparisonCard,
  BulletList,
  StepFlow,
  StatCallout,
  ArchitectureDiagram,
  SplitScreen,
  TypewriterText,
  TimelineFlow,
  QuoteCard,
  CodeBlock,
  TwoColumnLayout,
  BarChart,
  PacketFlow,
  HttpExchange,
  HashRing,
  StateMachine,
  TreeHierarchy,
  SequenceDiagram,
  LineChart,
  MathFormula,
  EquationDerivation,
  TerminalCLI,
  PieChart,
  NumberedList,
  GlossaryCards,
  FlowDiagram,
  CalloutAnnotation,
  SortingVisualizer,
  LinearStructure,
  ArrayAlgorithm,
  DPTableVisualizer,
  GraphTraversal,
  RecursionTree,
  HeapVisualizer,
  HashTable,
  TrieVisualizer,
  UnionFind,
  BSTOperations,
  SegmentTree,
  FenwickTree,
  RedBlackTree,
  BTreeVisualizer,
  SkipList,
  LRUCache,
  MonotonicStack,
  AStarPathfinding,
  StringMatching,
  BacktrackingGrid,
  BloomFilter,
  SieveOfEratosthenes,
  FlowNetwork,
  QuadTree,
  KDTree,
  StronglyConnectedComponents,
  GraphColoring,
  SuffixArray,
  IntervalScheduling,
  BitManipulation,
} as const;

export const COMPONENT_SCHEMAS = {
  AnimatedTitle: AnimatedTitleSchema,
  ComparisonCard: ComparisonCardSchema,
  BulletList: BulletListSchema,
  StepFlow: StepFlowSchema,
  StatCallout: StatCalloutSchema,
  ArchitectureDiagram: ArchitectureDiagramSchema,
  SplitScreen: SplitScreenSchema,
  TypewriterText: TypewriterTextSchema,
  TimelineFlow: TimelineFlowSchema,
  QuoteCard: QuoteCardSchema,
  CodeBlock: CodeBlockSchema,
  TwoColumnLayout: TwoColumnLayoutSchema,
  BarChart: BarChartSchema,
  PacketFlow: PacketFlowSchema,
  HttpExchange: HttpExchangeSchema,
  HashRing: HashRingSchema,
  StateMachine: StateMachineSchema,
  TreeHierarchy: TreeHierarchySchema,
  SequenceDiagram: SequenceDiagramSchema,
  LineChart: LineChartSchema,
  MathFormula: MathFormulaSchema,
  EquationDerivation: EquationDerivationSchema,
  TerminalCLI: TerminalCLISchema,
  PieChart: PieChartSchema,
  NumberedList: NumberedListSchema,
  GlossaryCards: GlossaryCardsSchema,
  FlowDiagram: FlowDiagramSchema,
  CalloutAnnotation: CalloutAnnotationSchema,
  SortingVisualizer: SortingVisualizerSchema,
  LinearStructure: LinearStructureSchema,
  ArrayAlgorithm: ArrayAlgorithmSchema,
  DPTableVisualizer: DPTableVisualizerSchema,
  GraphTraversal: GraphTraversalSchema,
  RecursionTree: RecursionTreeSchema,
  HeapVisualizer: HeapVisualizerSchema,
  HashTable: HashTableSchema,
  TrieVisualizer: TrieVisualizerSchema,
  UnionFind: UnionFindSchema,
  BSTOperations: BSTOperationsSchema,
  SegmentTree: SegmentTreeSchema,
  FenwickTree: FenwickTreeSchema,
  RedBlackTree: RedBlackTreeSchema,
  BTreeVisualizer: BTreeVisualizerSchema,
  SkipList: SkipListSchema,
  LRUCache: LRUCacheSchema,
  MonotonicStack: MonotonicStackSchema,
  AStarPathfinding: AStarPathfindingSchema,
  StringMatching: StringMatchingSchema,
  BacktrackingGrid: BacktrackingGridSchema,
  BloomFilter: BloomFilterSchema,
  SieveOfEratosthenes: SieveOfEratosthenesSchema,
  FlowNetwork: FlowNetworkSchema,
  QuadTree: QuadTreeSchema,
  KDTree: KDTreeSchema,
  StronglyConnectedComponents: StronglyConnectedComponentsSchema,
  GraphColoring: GraphColoringSchema,
  SuffixArray: SuffixArraySchema,
  IntervalScheduling: IntervalSchedulingSchema,
  BitManipulation: BitManipulationSchema,
} as const;

import { toJSONSchema } from "zod";

// Zod v4 ships a native JSON-Schema converter. The old `zod-to-json-schema`
// package targets zod v3 and silently emits empty schemas against v4 — which is
// what left the backend Validator with nothing to validate against.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJsonSchema = (schema: any, name?: string) => {
  const s = toJSONSchema(schema);
  // Optional: wrap it in a root def to match the old format if needed, 
  // but just returning it directly is fine for the validator
  return s;
};

/**
 * Picker metadata — the knowledge the planning agents (Shortlister, Director,
 * Timing) need that the Zod schema can't express:
 *   category   : coarse grouping for shortlisting
 *   dataOwner  : which agent fills `data` — "content" (Scriptwriter) | "visual" (Visual Architect)
 *   bestAreas  : grid areas this component looks good in
 *   useWhen    : one-line cue the Director uses to choose it
 *   tags       : lexical/affinity terms the Shortlister scores against
 *   minSeconds : minimum on-screen time for the animation to read (Timing floor)
 *
 * This is the ONLY place to declare a component's planning metadata. Adding a
 * component = add its entry here + the two lines above. Everything downstream
 * (catalog JSON, backend registry, shortlist, validation) is generated.
 */
export type ComponentMeta = {
  category:
    | "text"
    | "list"
    | "code"
    | "chart"
    | "network-diagram"
    | "state-tree"
    | "sequence"
    | "math"
    | "timeline"
    | "title"
    | "algorithm";
  dataOwner: "content" | "visual";
  bestAreas: string[];
  useWhen: string;
  tags: string[];
  minSeconds: number;
};

export const COMPONENT_META: Record<SceneType, ComponentMeta> = {
  AnimatedTitle: { category: "title", dataOwner: "content", bestAreas: ["panel"], useWhen: "scene 0 hook or final outro — a dramatic title with stakes", tags: ["title", "intro", "outro", "hook"], minSeconds: 4 },
  TypewriterText: { category: "title", dataOwner: "content", bestAreas: ["panel"], useWhen: "billboard-style dramatic 2-3 line statement", tags: ["dramatic", "statement", "reveal", "billboard"], minSeconds: 4 },
  QuoteCard: { category: "text", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a real verbatim quote from a paper, talk, or engineer", tags: ["quote", "authority", "citation"], minSeconds: 5 },
  CalloutAnnotation: { category: "text", dataOwner: "content", bestAreas: ["panel", "main", "sidebar"], useWhen: "emphasize a key insight or definition in prose", tags: ["insight", "definition", "takeaway", "explanation", "note"], minSeconds: 5 },
  BulletList: { category: "list", dataOwner: "content", bestAreas: ["left", "right", "sidebar"], useWhen: "5-7 specific claims, each with a number or system name", tags: ["list", "points", "facts", "explanation"], minSeconds: 7 },
  NumberedList: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "ranked principles or ordered top-N items", tags: ["ranked", "ordered", "principles", "steps"], minSeconds: 8 },
  GlossaryCards: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "vocabulary, acronym glossary, or concept map", tags: ["glossary", "terms", "vocabulary", "definitions"], minSeconds: 8 },
  StepFlow: { category: "list", dataOwner: "content", bestAreas: ["left", "main"], useWhen: "4-6 sequential steps, each starting with an action verb", tags: ["process", "steps", "sequence", "workflow"], minSeconds: 7 },
  ComparisonCard: { category: "list", dataOwner: "content", bestAreas: ["main", "left"], useWhen: "head-to-head pros vs cons of one subject", tags: ["comparison", "pros", "cons", "tradeoffs"], minSeconds: 8 },
  TwoColumnLayout: { category: "list", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "parallel comparison of two subjects (before/after, X vs Y)", tags: ["comparison", "parallel", "before-after", "two-column"], minSeconds: 8 },
  SplitScreen: { category: "code", dataOwner: "content", bestAreas: ["main"], useWhen: "text bullets and a code snippet together", tags: ["code", "hybrid", "text"], minSeconds: 8 },
  CodeBlock: { category: "code", dataOwner: "content", bestAreas: ["right", "main", "sidebar"], useWhen: "10-18 lines of real production code", tags: ["code", "implementation", "config", "snippet"], minSeconds: 8 },
  TerminalCLI: { category: "code", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a command plus its streamed terminal output", tags: ["terminal", "cli", "command", "shell", "debug"], minSeconds: 9 },
  HttpExchange: { category: "code", dataOwner: "content", bestAreas: ["main", "panel"], useWhen: "an HTTP request/response pair (REST, API, protocol)", tags: ["http", "api", "rest", "request", "protocol"], minSeconds: 9 },
  MathFormula: { category: "math", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a single key equation or Big-O expression", tags: ["math", "formula", "equation", "big-o", "notation"], minSeconds: 6 },
  EquationDerivation: { category: "math", dataOwner: "content", bestAreas: ["panel", "main"], useWhen: "a multi-step proof or algebraic derivation", tags: ["math", "proof", "derivation", "steps"], minSeconds: 10 },
  StatCallout: { category: "chart", dataOwner: "visual", bestAreas: ["sidebar", "right"], useWhen: "one surprising real-world number", tags: ["stat", "metric", "number", "benchmark"], minSeconds: 4 },
  BarChart: { category: "chart", dataOwner: "visual", bestAreas: ["right", "sidebar"], useWhen: "compare 4-6 real numeric values", tags: ["chart", "comparison", "benchmark", "metrics", "latency", "throughput"], minSeconds: 7 },
  LineChart: { category: "chart", dataOwner: "visual", bestAreas: ["main", "right"], useWhen: "trends over time, growth curves, latency vs load", tags: ["chart", "trend", "time-series", "growth", "curve"], minSeconds: 8 },
  PieChart: { category: "chart", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "proportional breakdown or traffic split", tags: ["chart", "proportion", "breakdown", "share", "split"], minSeconds: 7 },
  ArchitectureDiagram: { category: "network-diagram", dataOwner: "visual", bestAreas: ["main", "right"], useWhen: "system topology with servers, DBs, load balancers", tags: ["architecture", "topology", "system", "infrastructure", "diagram"], minSeconds: 9 },
  PacketFlow: { category: "network-diagram", dataOwner: "visual", bestAreas: ["main", "panel"], useWhen: "data packets traveling a network (protocols, routing)", tags: ["network", "packet", "protocol", "routing", "tcp"], minSeconds: 9 },
  HashRing: { category: "network-diagram", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "consistent hashing, sharding, CDN/cache placement", tags: ["hashing", "sharding", "cache", "distributed", "ring"], minSeconds: 10 },
  SequenceDiagram: { category: "sequence", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "time-ordered messages between actors/services", tags: ["sequence", "messages", "api-flow", "microservice", "auth"], minSeconds: 9 },
  StateMachine: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "finite states and transitions (protocols, FSMs)", tags: ["state-machine", "fsm", "protocol", "transitions", "raft"], minSeconds: 9 },
  TreeHierarchy: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "hierarchical structure (B-tree, DNS, file system, org)", tags: ["tree", "hierarchy", "b-tree", "dns", "recursion"], minSeconds: 8 },
  FlowDiagram: { category: "state-tree", dataOwner: "visual", bestAreas: ["panel", "main"], useWhen: "branching workflow with decisions (if/else logic)", tags: ["flowchart", "branching", "decision", "workflow", "algorithm"], minSeconds: 9 },
  TimelineFlow: { category: "timeline", dataOwner: "visual", bestAreas: ["main", "panel"], useWhen: "chronological history with real dates and events", tags: ["timeline", "history", "chronology", "roadmap", "events"], minSeconds: 8 },
  SortingVisualizer: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a sorting algorithm being walked through, or comparing sort algorithms visually",
    tags: ["sort", "algorithm", "swap", "comparison", "complexity", "bubble", "merge", "quick", "heap", "radix"],
    minSeconds: 10,
  },
  LinearStructure: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["panel", "main"],
    useWhen: "a linear data structure — array, stack, queue, deque, or linked list — being mutated by a sequence of operations",
    tags: ["array", "stack", "queue", "deque", "linked-list", "data-structure", "push", "pop"],
    minSeconds: 8,
  },
  ArrayAlgorithm: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "an array-scan algorithm — binary search, sliding window, or two-pointer technique",
    tags: ["array", "pointer", "binary-search", "sliding-window", "two-pointer"],
    minSeconds: 8,
  },
  DPTableVisualizer: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a 2D DP table being filled cell-by-cell, or a matrix-based algorithm (LCS, edit distance, Floyd-Warshall, knapsack)",
    tags: ["dp", "dynamic-programming", "matrix", "table", "memoization", "subproblems"],
    minSeconds: 12,
  },
  GraphTraversal: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a graph algorithm being traced — DFS/BFS traversal, shortest path (Dijkstra/Bellman-Ford), MST, or topological sort",
    tags: ["graph", "traversal", "dfs", "bfs", "dijkstra", "bellman-ford", "shortest-path", "mst", "topological"],
    minSeconds: 12,
  },
  RecursionTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a recursive call tree, backtracking search, or memoization pattern being walked through",
    tags: ["recursion", "tree", "backtracking", "memoization", "call-stack"],
    minSeconds: 12,
  },
  HeapVisualizer: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a binary heap / priority queue being built or mutated — insert (sift-up), extract-min/max (sift-down), heapsort",
    tags: ["heap", "priority-queue", "binary-heap", "sift", "heapsort", "min-heap", "max-heap"],
    minSeconds: 11,
  },
  HashTable: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a hash table with a hash function and collision resolution — separate chaining or open-addressing (linear probing)",
    tags: ["hash-table", "hashing", "collision", "chaining", "open-addressing", "probing", "buckets"],
    minSeconds: 11,
  },
  TrieVisualizer: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a trie / prefix tree — inserting words and searching words or prefixes character by character",
    tags: ["trie", "prefix-tree", "string", "autocomplete", "search", "prefix"],
    minSeconds: 11,
  },
  UnionFind: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a disjoint-set / union-find structure — union, find, union-by-rank and path compression (e.g. Kruskal's MST, connectivity)",
    tags: ["union-find", "disjoint-set", "dsu", "connectivity", "path-compression", "union-by-rank", "kruskal"],
    minSeconds: 10,
  },
  BSTOperations: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a binary search tree being mutated — insert, search, delete, and optional AVL self-balancing rotations",
    tags: ["bst", "binary-search-tree", "avl", "rotation", "self-balancing", "insert", "delete"],
    minSeconds: 12,
  },
  SegmentTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a segment tree answering range sum/min/max queries and point updates over an array",
    tags: ["segment-tree", "range-query", "range-sum", "range-min", "point-update", "divide-and-conquer"],
    minSeconds: 12,
  },
  FenwickTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a Fenwick tree / binary indexed tree doing prefix-sum queries and updates via i ± (i & -i)",
    tags: ["fenwick-tree", "binary-indexed-tree", "bit", "prefix-sum", "lowbit", "range-query"],
    minSeconds: 11,
  },
  RedBlackTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a red-black tree insertion with recoloring and rotations to stay balanced",
    tags: ["red-black-tree", "rbtree", "balanced-bst", "recolor", "rotation", "self-balancing"],
    minSeconds: 12,
  },
  BTreeVisualizer: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a B-tree / B+ tree with multi-key nodes splitting on overflow as keys are inserted (databases, filesystems)",
    tags: ["b-tree", "b+tree", "multiway-tree", "split", "database-index", "order"],
    minSeconds: 12,
  },
  SkipList: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a skip list search or insert walking express lanes (walk right, drop down) across levels",
    tags: ["skip-list", "probabilistic", "levels", "express-lane", "search", "ordered"],
    minSeconds: 11,
  },
  LRUCache: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "an LRU cache with a hash map + doubly-linked list — get/put, move-to-front, and eviction of the least-recently-used entry",
    tags: ["lru", "cache", "eviction", "doubly-linked-list", "hash-map", "capacity"],
    minSeconds: 11,
  },
  MonotonicStack: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a monotonic stack computing next/previous greater or smaller element for each array entry",
    tags: ["monotonic-stack", "next-greater-element", "stack", "sliding", "invariant"],
    minSeconds: 10,
  },
  AStarPathfinding: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "A* pathfinding on a grid with obstacles — open/closed sets and g/h/f costs guiding to the goal",
    tags: ["a-star", "astar", "pathfinding", "grid", "heuristic", "shortest-path", "search"],
    minSeconds: 12,
  },
  StringMatching: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a substring-search algorithm sliding a pattern over text — KMP, Rabin-Karp, or naive",
    tags: ["string-matching", "kmp", "rabin-karp", "pattern-search", "substring", "rolling-hash"],
    minSeconds: 11,
  },
  BacktrackingGrid: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a backtracking search on a board — N-Queens placing, detecting conflicts, and backtracking",
    tags: ["backtracking", "n-queens", "constraint", "search", "recursion", "board"],
    minSeconds: 12,
  },
  BloomFilter: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a Bloom filter — a bit array with k hash functions, insert setting bits, query returning maybe/definitely-not (probabilistic membership)",
    tags: ["bloom-filter", "probabilistic", "hashing", "bit-array", "membership", "false-positive"],
    minSeconds: 11,
  },
  SieveOfEratosthenes: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "the Sieve of Eratosthenes — crossing out multiples of each prime on a number grid to find all primes up to n",
    tags: ["sieve", "eratosthenes", "primes", "number-theory", "crossing-out", "grid"],
    minSeconds: 11,
  },
  FlowNetwork: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a maximum-flow computation — Ford-Fulkerson / Edmonds-Karp augmenting paths with edge flow/capacity and residuals",
    tags: ["max-flow", "min-cut", "edmonds-karp", "ford-fulkerson", "augmenting-path", "network-flow", "capacity"],
    minSeconds: 13,
  },
  QuadTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a point quadtree — a 2D region recursively subdividing into quadrants as points exceed a node's capacity (spatial indexing)",
    tags: ["quadtree", "spatial", "subdivision", "2d", "points", "collision", "spatial-index"],
    minSeconds: 12,
  },
  KDTree: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a 2D k-d tree — alternating x/y splits partitioning the plane (nearest-neighbour, range search)",
    tags: ["kd-tree", "spatial", "nearest-neighbour", "partition", "2d", "binary-space-partition"],
    minSeconds: 12,
  },
  StronglyConnectedComponents: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "Tarjan's strongly-connected-components — DFS with index/low-link values and a stack, closing SCCs on a directed graph",
    tags: ["scc", "tarjan", "strongly-connected", "low-link", "directed-graph", "dfs", "components"],
    minSeconds: 13,
  },
  GraphColoring: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "greedy graph coloring — assigning each vertex the smallest color not used by its neighbours",
    tags: ["graph-coloring", "greedy", "chromatic", "conflict", "vertex-coloring", "scheduling"],
    minSeconds: 11,
  },
  SuffixArray: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "a suffix array — sorting a string's suffixes and binary-searching a pattern against them",
    tags: ["suffix-array", "string", "sorting", "binary-search", "substring", "pattern"],
    minSeconds: 12,
  },
  IntervalScheduling: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "greedy interval scheduling / activity selection — sort by end time and pick non-overlapping intervals on a timeline",
    tags: ["interval-scheduling", "activity-selection", "greedy", "intervals", "timeline", "overlap"],
    minSeconds: 11,
  },
  BitManipulation: {
    category: "algorithm", dataOwner: "visual",
    bestAreas: ["main", "panel"],
    useWhen: "bit-level operations on a binary value — AND/OR/XOR/shift, set/clear/toggle a bit, NOT, popcount",
    tags: ["bit-manipulation", "bitwise", "and", "or", "xor", "shift", "popcount", "binary"],
    minSeconds: 10,
  },
};

export const COMPONENT_CATALOG = {
  AnimatedTitle: {
    description: "A large title with an optional subtitle and an animated underline. Good for intros and transitions.",
    schema: toJsonSchema(AnimatedTitleSchema, "AnimatedTitleProps"),
  },
  ComparisonCard: {
    description: "A card displaying a side-by-side comparison with pros and cons. Good for evaluating options.",
    schema: toJsonSchema(ComparisonCardSchema, "ComparisonCardProps"),
  },
  BulletList: {
    description: "A bulleted or numbered list with staggered reveal animation.",
    schema: toJsonSchema(BulletListSchema, "BulletListProps"),
  },
  StepFlow: {
    description: "A horizontal step-by-step flow diagram with an animated connector line.",
    schema: toJsonSchema(StepFlowSchema, "StepFlowProps"),
  },
  StatCallout: {
    description: "A large statistic callout with an animated counting number.",
    schema: toJsonSchema(StatCalloutSchema, "StatCalloutProps"),
  },
  ArchitectureDiagram: {
    description: "Renders an architecture diagram with servers, databases, and load balancers connected by animated data streams and arrows. Specify nodes and connections.",
    schema: toJsonSchema(ArchitectureDiagramSchema, "ArchitectureDiagramProps"),
  },
  SplitScreen: {
    description: "A layout scene showing a title, bullet points, code snippets, and optional media on the right side. Great for explaining technical concepts.",
    schema: toJsonSchema(SplitScreenSchema, "SplitScreenProps"),
  },
  TypewriterText: {
    description: "Animated typewriter effect with a blinking cursor. Reveals one or more lines of text character by character. Great for code reveals or dramatic text.",
    schema: toJsonSchema(TypewriterTextSchema, "TypewriterTextProps"),
  },
  TimelineFlow: {
    description: "An animated vertical or horizontal timeline with events appearing in staggered sequence. Use for history, roadmaps, or step-by-step processes.",
    schema: toJsonSchema(TimelineFlowSchema, "TimelineFlowProps"),
  },
  QuoteCard: {
    description: "A full-screen animated pull quote with an optional highlight sweep on key words and author attribution. Great for testimonials and impactful statements.",
    schema: toJsonSchema(QuoteCardSchema, "QuoteCardProps"),
  },
  CodeBlock: {
    description: "A macOS-style code window with syntax highlighting, line numbers, and optional line-by-line reveal animation. Ideal for showing code examples.",
    schema: toJsonSchema(CodeBlockSchema, "CodeBlockProps"),
  },
  TwoColumnLayout: {
    description: "A two-column comparison layout with an animated center divider. Each column has a heading and bullet points that slide in from opposite sides.",
    schema: toJsonSchema(TwoColumnLayoutSchema, "TwoColumnLayoutProps"),
  },
  BarChart: {
    description: "An animated bar chart with vertical or horizontal layout. Bars grow in with spring physics and values count up from 0. Use for data comparisons.",
    schema: toJsonSchema(BarChartSchema, "BarChartProps"),
  },
  PacketFlow: {
    description: "An animated network topology where data packets travel along edges between nodes. Nodes are positioned by x/y percentage coordinates. Ideal for showing network protocols, request routing, TCP handshakes, and distributed system data flows.",
    schema: toJsonSchema(PacketFlowSchema, "PacketFlowProps"),
  },
  HttpExchange: {
    description: "A side-by-side HTTP request and response viewer with line-by-line animated reveal. Shows method, path, headers, and body for both request and response. Great for explaining APIs, REST calls, and HTTP protocol details.",
    schema: toJsonSchema(HttpExchangeSchema, "HttpExchangeProps"),
  },
  HashRing: {
    description: "A consistent hashing ring with virtual nodes, server placement, and animated key lookups. Use for distributed caches, sharded databases, CDNs, and any consistent-hashing explanation.",
    schema: toJsonSchema(HashRingSchema, "HashRingProps"),
  },
  StateMachine: {
    description: "An animated finite-state machine with state boxes, labeled transition arrows, and a pulsing active state. Use for protocol diagrams (TCP handshake, Raft consensus), cache coherence, and workflow states.",
    schema: toJsonSchema(StateMachineSchema, "StateMachineProps"),
  },
  TreeHierarchy: {
    description: "A top-down tree diagram with auto-laid-out nodes and curved connectors. Use for B-trees, DNS hierarchy, recursion trees, file systems, org charts, and classification.",
    schema: toJsonSchema(TreeHierarchySchema, "TreeHierarchyProps"),
  },
  SequenceDiagram: {
    description: "A UML-style sequence diagram with actor lifelines and time-ordered request/response arrows. Use for API flows, microservice communication, and authentication sequences.",
    schema: toJsonSchema(SequenceDiagramSchema, "SequenceDiagramProps"),
  },
  LineChart: {
    description: "An animated multi-series line chart with optional area fill, grid lines, and legend. Lines draw in over time. Use for trends, growth curves, latency vs load, and any time-series comparison.",
    schema: toJsonSchema(LineChartSchema, "LineChartProps"),
  },
  MathFormula: {
    description: "A centered formula display with token-based rendering for variables, numbers, fractions, exponents, subscripts, square roots, and sums. Use for Big-O notation, equations, and math derivations.",
    schema: toJsonSchema(MathFormulaSchema, "MathFormulaProps"),
  },
  EquationDerivation: {
    description: "A vertical stack of formula steps connected by arrows, with optional justifications. Each step is a complete formula that can highlight independently. Use for proof walks and algebraic transformations.",
    schema: toJsonSchema(EquationDerivationSchema, "EquationDerivationProps"),
  },
  TerminalCLI: {
    description: "An animated terminal/CLI window that types a command then streams output line by line. Themes: dark, matrix, amber. Use for tutorials, debugging flows, and showing command output.",
    schema: toJsonSchema(TerminalCLISchema, "TerminalCLIProps"),
  },
  PieChart: {
    description: "An animated pie or donut chart with a sweeping reveal, percentage labels, an optional center label, and a side legend with values. Use for proportional breakdowns.",
    schema: toJsonSchema(PieChartSchema, "PieChartProps"),
  },
  NumberedList: {
    description: "A list of numbered cards with large colored badges, headings, and descriptions. Stack (vertical) or grid (2-column) layout. Use for ranked steps, principles, and ordered concepts.",
    schema: toJsonSchema(NumberedListSchema, "NumberedListProps"),
  },
  GlossaryCards: {
    description: "A grid of term/definition cards with colored icon tiles. Auto-detects 2- or 3-column layout. Use for vocabulary sections, acronym glossaries, and concept maps.",
    schema: toJsonSchema(GlossaryCardsSchema, "GlossaryCardsProps"),
  },
  FlowDiagram: {
    description: "A branching flow diagram with process (rectangle), decision (diamond), and start/end (pill) shapes connected by labeled arrows. Use for workflows, conditional logic, and algorithms with branching.",
    schema: toJsonSchema(FlowDiagramSchema, "FlowDiagramProps"),
  },
  CalloutAnnotation: {
    description: "A highlighted callout box with corner brackets, a side arrow, and optional bullet points. Use to emphasize a key insight or definition against a darker background.",
    schema: toJsonSchema(CalloutAnnotationSchema, "CalloutAnnotationProps"),
  },
  SortingVisualizer: {
    description: "An animated sorting-algorithm walkthrough. Bars represent values; steps compare, swap, partition, set, or merge-write to visualise bubble / merge / quick / heap / radix / counting sort.",
    schema: toJsonSchema(SortingVisualizerSchema, "SortingVisualizerProps"),
  },
  LinearStructure: {
    description: "An animated linear data structure — array, stack, queue, deque, or linked list — with push/pop/enqueue/dequeue/insert/delete motion. Cells shift, fade, and translate to visualise each operation.",
    schema: toJsonSchema(LinearStructureSchema, "LinearStructureProps"),
  },
  ArrayAlgorithm: {
    description: "An animated array walkthrough with pointer overlays. Modes: binary-search (L/M/R), sliding-window (start/end + running sum), two-pointer (i/j).",
    schema: toJsonSchema(ArrayAlgorithmSchema, "ArrayAlgorithmProps"),
  },
  DPTableVisualizer: {
    description: "An animated 2D DP table. Cells fill in order with dependency arrows from prior cells; optional final path traces the optimal answer.",
    schema: toJsonSchema(DPTableVisualizerSchema, "DPTableVisualizerProps"),
  },
  GraphTraversal: {
    description: "An animated graph algorithm walkthrough. Node states (unvisited/frontier/visited/settled) and edge states (traversed/relaxed/MST/rejected) update per step. Supports DFS, BFS, Dijkstra, Bellman-Ford, topological sort, Prim's and Kruskal's MST.",
    schema: toJsonSchema(GraphTraversalSchema, "GraphTraversalProps"),
  },
  RecursionTree: {
    description: "An animated recursion tree. Nodes grow in DFS order, then unwind with return values. Supports backtracking pruning (red dead-ends, green success paths) and memoization (memo-hit nodes stay collapsed).",
    schema: toJsonSchema(RecursionTreeSchema, "RecursionTreeProps"),
  },
  HeapVisualizer: {
    description: "An animated binary heap (min or max) drawn as a complete tree with an optional array view. Give `initial` values and `operations` (insert / extract); it walks the sift-up and sift-down compares and swaps automatically.",
    schema: toJsonSchema(HeapVisualizerSchema, "HeapVisualizerProps"),
  },
  HashTable: {
    description: "An animated hash table showing the hash function h(key) and collision resolution. Choose `strategy` \"chaining\" or \"open-addressing\"; give `operations` (insert / lookup / delete) and it animates hashing, probing, placement, hits and misses.",
    schema: toJsonSchema(HashTableSchema, "HashTableProps"),
  },
  TrieVisualizer: {
    description: "An animated trie / prefix tree. Give `operations` (insert / search / prefix); nodes appear as words are inserted and searches trace the path character by character, ending in a hit (green) or miss (red).",
    schema: toJsonSchema(TrieVisualizerSchema, "TrieVisualizerProps"),
  },
  UnionFind: {
    description: "An animated disjoint-set (union-find). Elements sit in a fixed row and parent-pointer arrows change as sets merge. Give `elements` and `operations` (union / find); supports union-by-rank and path compression.",
    schema: toJsonSchema(UnionFindSchema, "UnionFindProps"),
  },
  BSTOperations: {
    description: "An animated binary search tree. Give `initial` values and `operations` (insert / search / delete); nodes tween into place, comparisons highlight the path, and with `balance:\"avl\"` it performs and animates rotations to self-balance.",
    schema: toJsonSchema(BSTOperationsSchema, "BSTOperationsProps"),
  },
  SegmentTree: {
    description: "An animated segment tree over an array. Nodes cover ranges; `operations` run range queries (sum/min/max) highlighting full-cover vs partial nodes, and point updates propagating leaf→root. Set `op` to the aggregate.",
    schema: toJsonSchema(SegmentTreeSchema, "SegmentTreeProps"),
  },
  FenwickTree: {
    description: "An animated Fenwick tree (binary indexed tree) with the logical array and the BIT array. Updates walk i += i&-i and prefix-sum queries walk i -= i&-i, shown with index-jump arcs and a running sum.",
    schema: toJsonSchema(FenwickTreeSchema, "FenwickTreeProps"),
  },
  RedBlackTree: {
    description: "An animated red-black tree. Give `values` to insert; nodes are colored red/black, and the tree recolors and rotates to restore the red-black properties after each insertion.",
    schema: toJsonSchema(RedBlackTreeSchema, "RedBlackTreeProps"),
  },
  BTreeVisualizer: {
    description: "An animated B-tree of a given `order`. Keys insert into multi-key leaf nodes; when a node overflows it splits and promotes the median upward, cascading toward the root. Good for database indexes and filesystems.",
    schema: toJsonSchema(BTreeVisualizerSchema, "BTreeVisualizerProps"),
  },
  SkipList: {
    description: "An animated skip list with express lanes. `operations` (insert / search) walk right on a level then drop down to lower levels. Heights are deterministic (from the value or an explicit level).",
    schema: toJsonSchema(SkipListSchema, "SkipListProps"),
  },
  LRUCache: {
    description: "An animated LRU cache as an ordered list from most- to least-recently-used. `operations` (get / put) move entries to the front on access and evict the tail when over `capacity`.",
    schema: toJsonSchema(LRUCacheSchema, "LRUCacheProps"),
  },
  MonotonicStack: {
    description: "An animated monotonic stack computing the next/previous greater or smaller element (set `variant`). Shows the scan, the stack contents, pops, and the resulting answer array.",
    schema: toJsonSchema(MonotonicStackSchema, "MonotonicStackProps"),
  },
  AStarPathfinding: {
    description: "An animated A* search on a grid with walls. Cells show g and f costs; the open (frontier) and closed sets fill in until the goal is reached and the shortest path is traced. Set `heuristic` to manhattan or euclidean.",
    schema: toJsonSchema(AStarPathfindingSchema, "AStarPathfindingProps"),
  },
  StringMatching: {
    description: "An animated substring search sliding a `pattern` over `text`. Supports naive, KMP (LPS jumps), and Rabin-Karp (rolling hash); highlights each comparison and every match found.",
    schema: toJsonSchema(StringMatchingSchema, "StringMatchingProps"),
  },
  BacktrackingGrid: {
    description: "An animated N-Queens backtracking search. Queens are placed row by row; conflicts are shown against attacking queens and the search backtracks from dead ends until a full solution is found.",
    schema: toJsonSchema(BacktrackingGridSchema, "BacktrackingGridProps"),
  },
  BloomFilter: {
    description: "An animated Bloom filter — a bit array with k hash functions. Insert sets k bits; query checks them and reports \"possibly present\" (all set) or \"definitely not present\" (any clear), demonstrating false positives.",
    schema: toJsonSchema(BloomFilterSchema, "BloomFilterProps"),
  },
  SieveOfEratosthenes: {
    description: "An animated Sieve of Eratosthenes on a number grid. Each prime is highlighted and its multiples are crossed out; the numbers left standing are the primes up to n.",
    schema: toJsonSchema(SieveOfEratosthenesSchema, "SieveOfEratosthenesProps"),
  },
  FlowNetwork: {
    description: "An animated maximum-flow computation (Edmonds-Karp). Nodes are placed by x/y percent; BFS finds augmenting paths, edges show flow/capacity, and the running max-flow value updates until no path remains.",
    schema: toJsonSchema(FlowNetworkSchema, "FlowNetworkProps"),
  },
  QuadTree: {
    description: "An animated point quadtree over the unit square. Points insert one by one; when a leaf exceeds capacity it subdivides into four quadrants, showing spatial partitioning.",
    schema: toJsonSchema(QuadTreeSchema, "QuadTreeProps"),
  },
  KDTree: {
    description: "An animated 2D k-d tree. Points insert with alternating x/y splits; each split draws a line across its region, partitioning the plane. Vertical lines are x-splits, horizontal lines are y-splits.",
    schema: toJsonSchema(KDTreeSchema, "KDTreeProps"),
  },
  StronglyConnectedComponents: {
    description: "An animated Tarjan's SCC algorithm on a directed graph. Nodes show index/low-link values, a stack tracks the current path, and strongly connected components are colored as they close.",
    schema: toJsonSchema(StronglyConnectedComponentsSchema, "StronglyConnectedComponentsProps"),
  },
  GraphColoring: {
    description: "An animated greedy vertex coloring. Each vertex is assigned the smallest color not used by its already-colored neighbours; a legend shows the palette and the total colors used.",
    schema: toJsonSchema(GraphColoringSchema, "GraphColoringProps"),
  },
  SuffixArray: {
    description: "An animated suffix array. All suffixes of a string are listed, sorted lexicographically (the suffix array), then a pattern is located with binary search showing L/M/R pointers.",
    schema: toJsonSchema(SuffixArraySchema, "SuffixArrayProps"),
  },
  IntervalScheduling: {
    description: "An animated greedy interval scheduling (activity selection). Intervals are sorted by end time and shown on a timeline; non-overlapping ones are selected (green) and overlapping ones rejected (red).",
    schema: toJsonSchema(IntervalSchedulingSchema, "IntervalSchedulingProps"),
  },
  BitManipulation: {
    description: "An animated bit-manipulation walkthrough on a fixed-width binary value. Applies AND/OR/XOR with a mask, left/right shifts, set/clear/toggle a bit, NOT, and popcount, highlighting the bits that change.",
    schema: toJsonSchema(BitManipulationSchema, "BitManipulationProps"),
  },
};

export type SceneType = keyof typeof COMPONENT_REGISTRY;
