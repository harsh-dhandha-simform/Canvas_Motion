// HashTable.steps.ts — pure hash-table step generation (no React).
// Supports separate chaining and open-addressing (linear probing). Each step is
// a full snapshot so the component can render any step directly.

export type HashEntry = { key: string; value?: string };

export type HashStrategy = "chaining" | "open-addressing";

export type HashOp = {
  op: "insert" | "lookup" | "delete";
  key: string;
  value?: string;
};

export type HashStepKind =
  | "hash" | "probe" | "place" | "collision" | "found" | "miss" | "remove" | "settle";

export type HashStep = {
  strategy: HashStrategy;
  buckets: number;
  chains: HashEntry[][]; // used when strategy === "chaining"
  slots: (HashEntry | null)[]; // used when strategy === "open-addressing"
  activeBucket: number | null;
  activeInChain: number | null; // index within a chain (chaining lookups)
  key: string | null;
  hashCode: number | null;
  kind: HashStepKind;
  caption: string;
};

function hashCodeOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h += key.charCodeAt(i);
  return h;
}

export function generateHashSteps(
  strategy: HashStrategy,
  buckets: number,
  operations: HashOp[],
): HashStep[] {
  const B = Math.max(1, buckets);
  const steps: HashStep[] = [];
  const chains: HashEntry[][] = Array.from({ length: B }, () => []);
  const slots: (HashEntry | null)[] = Array.from({ length: B }, () => null);

  const snap = (
    kind: HashStepKind,
    caption: string,
    opts: {
      activeBucket?: number | null;
      activeInChain?: number | null;
      key?: string | null;
      hashCode?: number | null;
    } = {},
  ) =>
    steps.push({
      strategy,
      buckets: B,
      chains: chains.map((c) => c.map((e) => ({ ...e }))),
      slots: slots.map((s) => (s ? { ...s } : null)),
      activeBucket: opts.activeBucket ?? null,
      activeInChain: opts.activeInChain ?? null,
      key: opts.key ?? null,
      hashCode: opts.hashCode ?? null,
      kind,
      caption,
    });

  const indexOf = (key: string) => {
    const code = hashCodeOf(key);
    return { code, index: code % B };
  };

  function insertChaining(key: string, value?: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    const chain = chains[index];
    const existing = chain.findIndex((e) => e.key === key);
    if (existing >= 0) {
      chain[existing] = { key, value };
      snap("place", `update "${key}" in bucket ${index}`, { activeBucket: index, activeInChain: existing, key });
      return;
    }
    if (chain.length > 0) {
      snap("collision", `bucket ${index} occupied — append to chain`, { activeBucket: index, key });
    }
    chain.push({ key, value });
    snap("place", `store "${key}" in bucket ${index}`, { activeBucket: index, activeInChain: chain.length - 1, key });
  }

  function insertOpen(key: string, value?: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    let i = index;
    for (let probes = 0; probes < B; probes++) {
      const slot = slots[i];
      if (slot === null || slot.key === key) {
        slots[i] = { key, value };
        snap("place", `store "${key}" in slot ${i}`, { activeBucket: i, key });
        return;
      }
      snap("collision", `slot ${i} taken by "${slot.key}" — probe next`, { activeBucket: i, key });
      i = (i + 1) % B;
    }
    snap("miss", `table full — "${key}" not inserted`, { key });
  }

  function lookupChaining(key: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    const chain = chains[index];
    for (let j = 0; j < chain.length; j++) {
      snap("probe", `check "${chain[j].key}" in bucket ${index}`, { activeBucket: index, activeInChain: j, key });
      if (chain[j].key === key) {
        snap("found", `found "${key}"${chain[j].value ? ` → ${chain[j].value}` : ""}`, { activeBucket: index, activeInChain: j, key });
        return;
      }
    }
    snap("miss", `"${key}" not found`, { activeBucket: index, key });
  }

  function lookupOpen(key: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    let i = index;
    for (let probes = 0; probes < B; probes++) {
      const slot = slots[i];
      snap("probe", `check slot ${i}`, { activeBucket: i, key });
      if (slot === null) break;
      if (slot.key === key) {
        snap("found", `found "${key}"${slot.value ? ` → ${slot.value}` : ""}`, { activeBucket: i, key });
        return;
      }
      i = (i + 1) % B;
    }
    snap("miss", `"${key}" not found`, { key });
  }

  function deleteChaining(key: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    const chain = chains[index];
    const j = chain.findIndex((e) => e.key === key);
    if (j < 0) {
      snap("miss", `"${key}" not found — nothing to delete`, { activeBucket: index, key });
      return;
    }
    chain.splice(j, 1);
    snap("remove", `deleted "${key}" from bucket ${index}`, { activeBucket: index, key });
  }

  function deleteOpen(key: string) {
    const { code, index } = indexOf(key);
    snap("hash", `h("${key}") = ${code} % ${B} = ${index}`, { activeBucket: index, key, hashCode: code });
    let i = index;
    for (let probes = 0; probes < B; probes++) {
      const slot = slots[i];
      snap("probe", `check slot ${i}`, { activeBucket: i, key });
      if (slot === null) break;
      if (slot.key === key) {
        // ponytail: no tombstone — fine for teaching, would break probe chains in a real table.
        slots[i] = null;
        snap("remove", `deleted "${key}" from slot ${i}`, { activeBucket: i, key });
        return;
      }
      i = (i + 1) % B;
    }
    snap("miss", `"${key}" not found — nothing to delete`, { key });
  }

  for (const o of operations) {
    if (strategy === "chaining") {
      if (o.op === "insert") insertChaining(o.key, o.value);
      else if (o.op === "lookup") lookupChaining(o.key);
      else deleteChaining(o.key);
    } else {
      if (o.op === "insert") insertOpen(o.key, o.value);
      else if (o.op === "lookup") lookupOpen(o.key);
      else deleteOpen(o.key);
    }
  }

  snap("settle", "done");
  return steps;
}
