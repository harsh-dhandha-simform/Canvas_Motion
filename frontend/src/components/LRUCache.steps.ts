// LRUCache.steps.ts — pure LRU-cache step generation (no React).
// Order array is MRU (front) → LRU (back). Each step snapshots the ordered
// entries + the active key + what happened (hit/miss/insert/evict/update).

export type LRUOperation =
  | { op: "get"; key: string }
  | { op: "put"; key: string; value: string };

export type LRUEntry = { key: string; value: string };

export type LRUStepKind =
  | "hit" | "miss" | "insert" | "evict" | "update" | "settle";

export type LRUStep = {
  entries: LRUEntry[]; // MRU → LRU
  capacity: number;
  active: string | null;
  evicted: string | null;
  kind: LRUStepKind;
  caption: string;
};

export function generateLRUSteps(
  capacity: number,
  operations: LRUOperation[],
): LRUStep[] {
  const cap = Math.max(1, capacity);
  const order: string[] = []; // MRU first
  const map = new Map<string, string>();
  const steps: LRUStep[] = [];

  const snap = (active: string | null, evicted: string | null, kind: LRUStepKind, caption: string) =>
    steps.push({
      entries: order.map((k) => ({ key: k, value: map.get(k) as string })),
      capacity: cap,
      active,
      evicted,
      kind,
      caption,
    });

  const moveToFront = (key: string) => {
    const i = order.indexOf(key);
    if (i >= 0) order.splice(i, 1);
    order.unshift(key);
  };

  for (const op of operations) {
    if (op.op === "get") {
      if (map.has(op.key)) {
        moveToFront(op.key);
        snap(op.key, null, "hit", `get(${op.key}) → ${map.get(op.key)} (hit, now MRU)`);
      } else {
        snap(op.key, null, "miss", `get(${op.key}) → miss`);
      }
    } else {
      if (map.has(op.key)) {
        map.set(op.key, op.value);
        moveToFront(op.key);
        snap(op.key, null, "update", `put(${op.key}, ${op.value}) — update, now MRU`);
      } else {
        map.set(op.key, op.value);
        order.unshift(op.key);
        snap(op.key, null, "insert", `put(${op.key}, ${op.value}) — insert at MRU`);
        if (order.length > cap) {
          const lru = order.pop() as string;
          map.delete(lru);
          snap(null, lru, "evict", `over capacity → evict LRU "${lru}"`);
        }
      }
    }
  }

  snap(null, null, "settle", "done");
  return steps;
}
