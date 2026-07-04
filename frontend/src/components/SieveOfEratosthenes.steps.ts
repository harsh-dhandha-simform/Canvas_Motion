// SieveOfEratosthenes.steps.ts — pure prime-sieve step generation (no React).
// Marks composites by crossing out multiples of each prime; whatever stays
// uncrossed (≥ 2) is prime. Each step snapshots the crossed[] state.

export type SieveStepKind = "prime" | "cross" | "settle";

export type SieveStep = {
  n: number;
  crossed: boolean[]; // index by number, 0..n
  currentPrime: number | null;
  currentMultiple: number | null;
  kind: SieveStepKind;
  caption: string;
};

export function primesUpTo(n: number): number[] {
  const crossed = new Array(n + 1).fill(false);
  const primes: number[] = [];
  for (let p = 2; p <= n; p++) {
    if (!crossed[p]) {
      primes.push(p);
      for (let m = p * p; m <= n; m += p) crossed[m] = true;
    }
  }
  return primes;
}

export function generateSieveSteps(n: number): SieveStep[] {
  const crossed = new Array(n + 1).fill(false);
  const steps: SieveStep[] = [];
  const snap = (
    currentPrime: number | null,
    currentMultiple: number | null,
    kind: SieveStepKind,
    caption: string,
  ) => steps.push({ n, crossed: [...crossed], currentPrime, currentMultiple, kind, caption });

  for (let p = 2; p * p <= n; p++) {
    if (!crossed[p]) {
      snap(p, null, "prime", `${p} is prime — cross out its multiples`);
      for (let m = p * p; m <= n; m += p) {
        if (!crossed[m]) {
          crossed[m] = true;
          snap(p, m, "cross", `cross out ${m} = ${p} × ${m / p}`);
        }
      }
    }
  }

  const primes: number[] = [];
  for (let i = 2; i <= n; i++) if (!crossed[i]) primes.push(i);
  snap(null, null, "settle", `${primes.length} primes ≤ ${n}: ${primes.join(", ")}`);
  return steps;
}
