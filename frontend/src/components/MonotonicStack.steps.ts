// MonotonicStack.steps.ts — pure monotonic-stack step generation (no React).
// Computes next/prev greater/smaller element for each array entry, snapshotting
// the stack, the running answer, and the active indices at every step.

export type MonoVariant =
  | "next-greater" | "next-smaller" | "prev-greater" | "prev-smaller";

export type MonoStepKind = "scan" | "pop" | "push" | "resolve" | "settle";

export type MonoStep = {
  values: number[];
  stack: number[]; // indices, top = last
  answer: (number | null)[];
  current: number | null;
  active: number[];
  kind: MonoStepKind;
  caption: string;
};

export function computeMonoAnswer(values: number[], variant: MonoVariant): (number | null)[] {
  const n = values.length;
  const answer: (number | null)[] = new Array(n).fill(null);
  const stack: number[] = [];
  const isNext = variant === "next-greater" || variant === "next-smaller";
  if (isNext) {
    for (let i = 0; i < n; i++) {
      while (stack.length) {
        const top = stack[stack.length - 1];
        const pop = variant === "next-greater" ? values[top] < values[i] : values[top] > values[i];
        if (!pop) break;
        answer[top] = values[i];
        stack.pop();
      }
      stack.push(i);
    }
  } else {
    for (let i = 0; i < n; i++) {
      while (stack.length) {
        const top = stack[stack.length - 1];
        const pop = variant === "prev-greater" ? values[top] <= values[i] : values[top] >= values[i];
        if (!pop) break;
        stack.pop();
      }
      answer[i] = stack.length ? values[stack[stack.length - 1]] : null;
      stack.push(i);
    }
  }
  return answer;
}

export function generateMonoStackSteps(values: number[], variant: MonoVariant): MonoStep[] {
  const n = values.length;
  const answer: (number | null)[] = new Array(n).fill(null);
  const stack: number[] = [];
  const steps: MonoStep[] = [];
  const isNext = variant === "next-greater" || variant === "next-smaller";

  const snap = (current: number | null, active: number[], kind: MonoStepKind, caption: string) =>
    steps.push({ values, stack: [...stack], answer: [...answer], current, active, kind, caption });

  const popCond = (top: number, i: number) => {
    switch (variant) {
      case "next-greater": return values[top] < values[i];
      case "next-smaller": return values[top] > values[i];
      case "prev-greater": return values[top] <= values[i];
      case "prev-smaller": return values[top] >= values[i];
    }
  };

  for (let i = 0; i < n; i++) {
    snap(i, [i], "scan", `scan index ${i} (value ${values[i]})`);
    while (stack.length && popCond(stack[stack.length - 1], i)) {
      const top = stack[stack.length - 1];
      if (isNext) {
        answer[top] = values[i];
        stack.pop();
        snap(i, [i, top], "resolve", `${values[i]} resolves index ${top} → ${values[i]}`);
      } else {
        stack.pop();
        snap(i, [i, top], "pop", `pop ${top} (not ${variant.split("-")[1]} enough)`);
      }
    }
    if (!isNext) {
      const top = stack.length ? stack[stack.length - 1] : -1;
      answer[i] = top >= 0 ? values[top] : null;
      snap(i, top >= 0 ? [i, top] : [i], "resolve", `answer[${i}] = ${answer[i] === null ? "none" : answer[i]}`);
    }
    stack.push(i);
    snap(i, [i], "push", `push index ${i}`);
  }

  snap(null, [], "settle", "done");
  return steps;
}
