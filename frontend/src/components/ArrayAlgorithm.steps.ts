import type { ArrayStep } from "./ArrayAlgorithm";

type Mode = "binary-search" | "sliding-window" | "two-pointer";

export function generateArrayAlgorithmSteps(
  mode: Mode,
  values: (number | string)[],
  target?: number | string,
  windowSize?: number,
): ArrayStep[] {
  switch (mode) {
    case "binary-search":
      return binarySearch(values as number[], target as number);
    case "sliding-window":
      return slidingWindow(values as number[], windowSize ?? 3);
    case "two-pointer":
      return twoPointer(values as number[], target as number);
  }
}

function binarySearch(arr: number[], target: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  let L = 0, R = arr.length - 1;
  while (L <= R) {
    const M = Math.floor((L + R) / 2);
    steps.push({ pointers: { L, M, R }, note: `arr[${M}]=${arr[M]}` });
    if (arr[M] === target) {
      steps.push({ pointers: { L, M, R }, result: "found", note: `found ${target}` });
      return steps;
    }
    if (arr[M] < target) {
      L = M + 1;
      const nextM = Math.max(L, Math.min(R, Math.floor((L + R) / 2)));
      steps.push({ pointers: { L, M: nextM, R }, result: "narrow-right" });
    } else {
      R = M - 1;
      const nextM = Math.max(L, Math.min(R, Math.floor((L + R) / 2)));
      steps.push({ pointers: { L, M: nextM, R }, result: "narrow-left" });
    }
  }
  return steps;
}

function slidingWindow(arr: number[], k: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  if (arr.length < k) return steps;
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i];
  steps.push({ pointers: { start: 0, end: k - 1 }, windowSum: sum, result: "expand" });
  for (let end = k; end < arr.length; end++) {
    sum += arr[end] - arr[end - k];
    steps.push({
      pointers: { start: end - k + 1, end },
      windowSum: sum,
      result: "advance",
    });
  }
  return steps;
}

function twoPointer(arr: number[], target: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  let i = 0, j = arr.length - 1;
  while (i < j) {
    const sum = arr[i] + arr[j];
    steps.push({ pointers: { i, j }, note: `${arr[i]} + ${arr[j]} = ${sum}` });
    if (sum === target) {
      steps.push({ pointers: { i, j }, result: "found" });
      return steps;
    }
    if (sum < target) { i++; steps.push({ pointers: { i, j }, result: "advance" }); }
    else { j--; steps.push({ pointers: { i, j }, result: "advance" }); }
  }
  return steps;
}
