// BloomFilter.steps.ts — pure Bloom-filter step generation (no React).
// k positions per key via double hashing: p_i = (h1 + i*h2) mod m. Insert sets
// those bits; query reports "maybe" (all set) or "definitely not" (any clear).

export type BloomOperation = { op: "insert" | "query"; key: string };

export type BloomStepKind = "hash" | "set" | "check" | "maybe" | "definitely-not" | "settle";

export type BloomStep = {
  bits: boolean[];
  size: number;
  k: number;
  activeBits: number[];
  key: string | null;
  result: "maybe" | "no" | null;
  kind: BloomStepKind;
  caption: string;
};

const h1 = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const h2 = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i) + 7) >>> 0;
  return h || 1;
};

export function bloomPositions(key: string, size: number, k: number): number[] {
  const a = h1(key);
  const b = h2(key);
  const out: number[] = [];
  for (let i = 0; i < k; i++) out.push(((a + i * b) >>> 0) % size);
  return out;
}

export function generateBloomSteps(
  operations: BloomOperation[],
  size = 16,
  k = 3,
): BloomStep[] {
  const m = Math.max(1, size);
  const bits = new Array(m).fill(false);
  const steps: BloomStep[] = [];
  const snap = (
    activeBits: number[],
    key: string | null,
    result: "maybe" | "no" | null,
    kind: BloomStepKind,
    caption: string,
  ) => steps.push({ bits: [...bits], size: m, k, activeBits, key, result, kind, caption });

  for (const op of operations) {
    const pos = bloomPositions(op.key, m, k);
    if (op.op === "insert") {
      snap(pos, op.key, null, "hash", `insert "${op.key}" → bits [${pos.join(", ")}]`);
      for (const p of pos) bits[p] = true;
      snap(pos, op.key, null, "set", `set bits [${pos.join(", ")}]`);
    } else {
      snap(pos, op.key, null, "check", `query "${op.key}" → check bits [${pos.join(", ")}]`);
      const allSet = pos.every((p) => bits[p]);
      if (allSet) snap(pos, op.key, "maybe", "maybe", `all bits set → "${op.key}" possibly present`);
      else snap(pos, op.key, "no", "definitely-not", `a bit is 0 → "${op.key}" definitely NOT present`);
    }
  }

  snap([], null, null, "settle", "done");
  return steps;
}
