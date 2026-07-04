// StringMatching.steps.ts — pure pattern-matching step generation (no React).
// naive / KMP / Rabin-Karp, each snapshotting the current alignment, the chars
// being compared, and matches found so far. All three yield identical matches.

export type MatchAlgorithm = "naive" | "kmp" | "rabin-karp";

export type MatchStepKind =
  | "align" | "compare" | "match" | "mismatch" | "found" | "shift" | "hash" | "settle";

export type MatchStep = {
  shift: number; // pattern's left index under the text
  ti: number | null; // text index being compared
  pj: number | null; // pattern index being compared
  matched: number[]; // start indices found so far
  patHash: number | null;
  winHash: number | null;
  kind: MatchStepKind;
  caption: string;
};

export function findAllMatches(text: string, pattern: string): number[] {
  const out: number[] = [];
  if (!pattern) return out;
  for (let s = 0; s + pattern.length <= text.length; s++) {
    let ok = true;
    for (let j = 0; j < pattern.length; j++) {
      if (text[s + j] !== pattern[j]) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(s);
  }
  return out;
}

function computeLps(pattern: string): number[] {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      lps[i++] = ++len;
    } else if (len > 0) {
      len = lps[len - 1];
    } else {
      lps[i++] = 0;
    }
  }
  return lps;
}

export function generateStringMatchSteps(
  text: string,
  pattern: string,
  algorithm: MatchAlgorithm,
): MatchStep[] {
  const n = text.length;
  const m = pattern.length;
  const matched: number[] = [];
  const steps: MatchStep[] = [];
  const snap = (
    shift: number,
    ti: number | null,
    pj: number | null,
    kind: MatchStepKind,
    caption: string,
    patHash: number | null = null,
    winHash: number | null = null,
  ) => steps.push({ shift, ti, pj, matched: [...matched], patHash, winHash, kind, caption });

  if (m === 0 || m > n) {
    snap(0, null, null, "settle", "nothing to match");
    return steps;
  }

  if (algorithm === "naive") {
    for (let s = 0; s + m <= n; s++) {
      snap(s, null, null, "align", `align pattern at index ${s}`);
      let ok = true;
      for (let j = 0; j < m; j++) {
        snap(s, s + j, j, "compare", `compare '${text[s + j]}' vs '${pattern[j]}'`);
        if (text[s + j] !== pattern[j]) {
          snap(s, s + j, j, "mismatch", `mismatch → shift by 1`);
          ok = false;
          break;
        }
        snap(s, s + j, j, "match", `match`);
      }
      if (ok) {
        matched.push(s);
        snap(s, null, null, "found", `match found at index ${s}`);
      }
    }
  } else if (algorithm === "kmp") {
    const lps = computeLps(pattern);
    let i = 0;
    let j = 0;
    while (i < n) {
      snap(i - j, i, j, "compare", `compare '${text[i]}' vs '${pattern[j]}'`);
      if (text[i] === pattern[j]) {
        snap(i - j, i, j, "match", `match`);
        i++;
        j++;
        if (j === m) {
          matched.push(i - j);
          snap(i - j, null, null, "found", `match found at index ${i - j}`);
          j = lps[j - 1];
        }
      } else {
        snap(i - j, i, j, "mismatch", `mismatch`);
        if (j > 0) {
          j = lps[j - 1];
          snap(i - j, null, null, "shift", `jump via LPS to j=${j}`);
        } else {
          i++;
        }
      }
    }
  } else {
    // Rabin-Karp rolling hash
    const base = 256;
    const mod = 1_000_000_007;
    let patHash = 0;
    let winHash = 0;
    let h = 1;
    for (let k = 0; k < m - 1; k++) h = (h * base) % mod;
    for (let k = 0; k < m; k++) {
      patHash = (patHash * base + pattern.charCodeAt(k)) % mod;
      winHash = (winHash * base + text.charCodeAt(k)) % mod;
    }
    for (let s = 0; s + m <= n; s++) {
      snap(s, null, null, "hash", `hash window = ${winHash}, pattern = ${patHash}`, patHash, winHash);
      if (winHash === patHash) {
        let ok = true;
        for (let j = 0; j < m; j++) {
          snap(s, s + j, j, "compare", `verify '${text[s + j]}' vs '${pattern[j]}'`, patHash, winHash);
          if (text[s + j] !== pattern[j]) {
            snap(s, s + j, j, "mismatch", `hash collision — not a real match`, patHash, winHash);
            ok = false;
            break;
          }
          snap(s, s + j, j, "match", `match`, patHash, winHash);
        }
        if (ok) {
          matched.push(s);
          snap(s, null, null, "found", `match found at index ${s}`, patHash, winHash);
        }
      }
      if (s + m < n) {
        winHash = ((winHash - text.charCodeAt(s) * h) % mod + mod) % mod;
        winHash = (winHash * base + text.charCodeAt(s + m)) % mod;
      }
    }
  }

  snap(0, null, null, "settle", `${matched.length} match(es): [${matched.join(", ")}]`);
  return steps;
}
