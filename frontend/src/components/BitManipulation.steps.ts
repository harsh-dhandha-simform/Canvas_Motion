// BitManipulation.steps.ts — pure bit-operation step generation (no React).
// Applies AND/OR/XOR/shift/set/clear/toggle/NOT/popcount to a value, snapshotting
// the before/operand/result bit rows and which bits changed.

export type BitOperation =
  | { op: "and" | "or" | "xor"; mask: number }
  | { op: "shl" | "shr"; by: number }
  | { op: "set" | "clear" | "toggle"; bit: number }
  | { op: "not" }
  | { op: "popcount" };

export type BitStepKind = "init" | "op" | "popcount" | "settle";

export type BitStep = {
  width: number;
  topBits: (0 | 1)[]; // MSB..LSB, value before the op
  operandBits: (0 | 1)[] | null;
  resultBits: (0 | 1)[] | null;
  changed: number[]; // display indices highlighted
  opSymbol: string;
  popcount: number | null;
  kind: BitStepKind;
  caption: string;
};

const toBits = (v: number, width: number): (0 | 1)[] => {
  const out: (0 | 1)[] = [];
  for (let i = width - 1; i >= 0; i--) out.push(((v >> i) & 1) as 0 | 1);
  return out;
};

const changedIdx = (a: (0 | 1)[], b: (0 | 1)[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
};

export function applyBitOps(value: number, ops: BitOperation[], width: number): number {
  const all = (1 << width) - 1;
  let v = value & all;
  for (const op of ops) {
    switch (op.op) {
      case "and": v = v & op.mask; break;
      case "or": v = v | op.mask; break;
      case "xor": v = v ^ op.mask; break;
      case "shl": v = (v << op.by) & all; break;
      case "shr": v = v >> op.by; break;
      case "set": v = v | (1 << op.bit); break;
      case "clear": v = v & ~(1 << op.bit); break;
      case "toggle": v = v ^ (1 << op.bit); break;
      case "not": v = ~v & all; break;
      case "popcount": break;
    }
    v = v & all;
  }
  return v;
}

export function generateBitSteps(value: number, ops: BitOperation[], width = 8): BitStep[] {
  const all = (1 << width) - 1;
  let v = value & all;
  const steps: BitStep[] = [];

  steps.push({
    width,
    topBits: toBits(v, width),
    operandBits: null,
    resultBits: null,
    changed: [],
    opSymbol: "",
    popcount: null,
    kind: "init",
    caption: `x = ${v} (0b${toBits(v, width).join("")})`,
  });

  for (const op of ops) {
    const before = toBits(v, width);
    let operandBits: (0 | 1)[] | null = null;
    let opSymbol = "";
    let popcount: number | null = null;
    let kind: BitStepKind = "op";
    let caption = "";
    let next = v;

    switch (op.op) {
      case "and": next = v & op.mask; operandBits = toBits(op.mask, width); opSymbol = `AND ${op.mask}`; caption = `x & ${op.mask} = ${next}`; break;
      case "or": next = v | op.mask; operandBits = toBits(op.mask, width); opSymbol = `OR ${op.mask}`; caption = `x | ${op.mask} = ${next}`; break;
      case "xor": next = v ^ op.mask; operandBits = toBits(op.mask, width); opSymbol = `XOR ${op.mask}`; caption = `x ^ ${op.mask} = ${next}`; break;
      case "shl": next = (v << op.by) & all; opSymbol = `<< ${op.by}`; caption = `x << ${op.by} = ${next}`; break;
      case "shr": next = v >> op.by; opSymbol = `>> ${op.by}`; caption = `x >> ${op.by} = ${next}`; break;
      case "set": next = v | (1 << op.bit); opSymbol = `set bit ${op.bit}`; caption = `set bit ${op.bit} → ${next}`; break;
      case "clear": next = v & ~(1 << op.bit); opSymbol = `clear bit ${op.bit}`; caption = `clear bit ${op.bit} → ${next}`; break;
      case "toggle": next = v ^ (1 << op.bit); opSymbol = `toggle bit ${op.bit}`; caption = `toggle bit ${op.bit} → ${next}`; break;
      case "not": next = ~v & all; opSymbol = `NOT`; caption = `~x = ${next}`; break;
      case "popcount": {
        kind = "popcount";
        popcount = before.filter((b) => b === 1).length;
        opSymbol = `popcount`;
        caption = `popcount(x) = ${popcount} set bit(s)`;
        break;
      }
    }
    next = next & all;
    const after = toBits(next, width);

    steps.push({
      width,
      topBits: before,
      operandBits,
      resultBits: op.op === "popcount" ? null : after,
      changed: op.op === "popcount" ? before.map((b, i) => (b === 1 ? i : -1)).filter((i) => i >= 0) : changedIdx(before, after),
      opSymbol,
      popcount,
      kind,
      caption,
    });
    v = next;
  }

  steps.push({
    width,
    topBits: toBits(v, width),
    operandBits: null,
    resultBits: null,
    changed: [],
    opSymbol: "",
    popcount: null,
    kind: "settle",
    caption: `x = ${v}`,
  });
  return steps;
}
