import type { SortStep } from "./SortingVisualizer";

type Algorithm =
  | "bubble" | "merge" | "quick" | "heap" | "radix" | "counting";

export function generateSortSteps(
  algorithm: Algorithm,
  values: number[]
): SortStep[] {
  const arr = [...values];
  switch (algorithm) {
    case "bubble":   return bubbleSteps(arr);
    case "quick":    return quickSteps(arr, 0, arr.length - 1, []);
    case "merge":    return mergeSteps(arr);
    case "heap":     return heapSteps(arr);
    case "radix":    return radixSteps(arr);
    case "counting": return countingSteps(arr);
  }
}

function bubbleSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ kind: "compare", indices: [j, j + 1] });
      if (arr[j] > arr[j + 1]) {
        steps.push({ kind: "swap", indices: [j, j + 1] });
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return steps;
}

function quickSteps(
  arr: number[], lo: number, hi: number, steps: SortStep[]
): SortStep[] {
  if (lo >= hi) return steps;
  const pivot = arr[hi];
  steps.push({ kind: "partition", indices: [lo, hi], note: `pivot=${pivot}` });
  let i = lo;
  for (let j = lo; j < hi; j++) {
    steps.push({ kind: "compare", indices: [j, hi] });
    if (arr[j] < pivot) {
      if (i !== j) {
        steps.push({ kind: "swap", indices: [i, j] });
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      i++;
    }
  }
  steps.push({ kind: "swap", indices: [i, hi] });
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  quickSteps(arr, lo, i - 1, steps);
  quickSteps(arr, i + 1, hi, steps);
  return steps;
}

function mergeSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const aux = [...arr];
  function merge(lo: number, mid: number, hi: number) {
    for (let k = lo; k <= hi; k++) aux[k] = arr[k];
    let i = lo, j = mid + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > mid) { arr[k] = aux[j++]; }
      else if (j > hi) { arr[k] = aux[i++]; }
      else if (aux[j] < aux[i]) { arr[k] = aux[j++]; }
      else { arr[k] = aux[i++]; }
      steps.push({ kind: "merge-write", indices: [k], writeValue: arr[k] });
    }
  }
  function sort(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }
  sort(0, arr.length - 1);
  return steps;
}

function heapSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const n = arr.length;
  function siftDown(start: number, end: number) {
    let root = start;
    while (2 * root + 1 <= end) {
      const child = 2 * root + 1;
      let swap = root;
      if (arr[swap] < arr[child]) swap = child;
      if (child + 1 <= end && arr[swap] < arr[child + 1]) swap = child + 1;
      steps.push({ kind: "compare", indices: [root, child] });
      if (swap === root) return;
      steps.push({ kind: "swap", indices: [root, swap] });
      [arr[root], arr[swap]] = [arr[swap], arr[root]];
      root = swap;
    }
  }
  for (let start = Math.floor(n / 2) - 1; start >= 0; start--) siftDown(start, n - 1);
  for (let end = n - 1; end > 0; end--) {
    steps.push({ kind: "swap", indices: [0, end] });
    [arr[0], arr[end]] = [arr[end], arr[0]];
    siftDown(0, end - 1);
  }
  return steps;
}

function countingSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);
  for (const v of arr) count[v]++;
  let idx = 0;
  for (let v = 0; v <= max; v++) {
    while (count[v]-- > 0) {
      steps.push({ kind: "set", indices: [idx], writeValue: v });
      arr[idx] = v;
      idx++;
    }
  }
  return steps;
}

function radixSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const max = Math.max(...arr);
  let exp = 1;
  while (Math.floor(max / exp) > 0) {
    const output = new Array(arr.length).fill(0);
    const count = new Array(10).fill(0);
    for (const v of arr) count[Math.floor(v / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      output[count[digit] - 1] = arr[i];
      count[digit]--;
    }
    for (let i = 0; i < arr.length; i++) {
      steps.push({ kind: "set", indices: [i], writeValue: output[i] });
      arr[i] = output[i];
    }
    exp *= 10;
  }
  return steps;
}
