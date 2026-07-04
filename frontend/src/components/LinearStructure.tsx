import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";

export const LinearOpSchema = z.object({
  op: z.enum([
    "push", "pop",
    "enqueue", "dequeue",
    "push-front", "push-back",
    "pop-front", "pop-back",
    "insert-at", "delete-at",
    "read",
  ]),
  value: z.union([z.number(), z.string()]).optional(),
  index: z.number().optional(),
  note: z.string().optional(),
});

export const LinearStructureSchema = z.object({
  title: z.string().optional(),
  kind: z.enum(["array", "stack", "queue", "deque", "linked-list"]),
  initial: z.array(z.union([z.number(), z.string()])),
  operations: z.array(LinearOpSchema),
  showIndices: z.boolean().optional(),
  showHeadTail: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type LinearOp = z.infer<typeof LinearOpSchema>;
export type LinearStructureProps = z.infer<typeof LinearStructureSchema>;

type CellValue = number | string;

function applyOp(arr: CellValue[], op: LinearOp): CellValue[] {
  const next = [...arr];
  switch (op.op) {
    case "push":
    case "push-back":
    case "enqueue":
      if (op.value !== undefined) next.push(op.value);
      break;
    case "push-front":
      if (op.value !== undefined) next.unshift(op.value);
      break;
    case "pop":
    case "pop-back":
      next.pop();
      break;
    case "dequeue":
    case "pop-front":
      next.shift();
      break;
    case "insert-at":
      if (typeof op.index === "number" && op.value !== undefined)
        next.splice(op.index, 0, op.value);
      break;
    case "delete-at":
      if (typeof op.index === "number") next.splice(op.index, 1);
      break;
    case "read":
      break;
  }
  return next;
}

function reduceUpTo(initial: CellValue[], ops: LinearOp[], k: number): CellValue[] {
  let arr = initial;
  for (let i = 0; i < k; i++) arr = applyOp(arr, ops[i]);
  return arr;
}

export const LinearStructure: React.FC<LinearStructureProps> = ({
  title, kind, initial, operations,
  showIndices = true, showHeadTail = true,
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  if (operations.length === 0) {
    return (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        padding: "60px 80px", boxSizing: "border-box", gap: 40,
        background: theme.background, fontFamily: `${theme.font}, sans-serif`,
        position: "relative",
      }}>
        {title && (
          <h2 style={{
            fontSize: 48, fontWeight: 900, color: "#f1f5f9",
            letterSpacing: "-0.03em", margin: 0,
          }}>{title}</h2>
        )}
      </div>
    );
  }

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentStepIdx = Math.min(operations.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(currentStepIdx, { stepFrames, frame, fps });

  const before = reduceUpTo(initial, operations, currentStepIdx);
  const current = operations[currentStepIdx];
  const isVerticalStack = kind === "stack";
  const cellW = 90, cellH = 60, gap = 8;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Determine the "after" array for this step (for visualising insertions).
  const after = applyOp(before, current);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      position: "relative",
    }}>
      {title && (
        <h2 style={{
          fontSize: 48, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: isVerticalStack ? "column-reverse" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap,
        position: "relative",
      }}>
        {renderCells({
          before, after, current, progress,
          kind, accent, theme, cellW, cellH, gap,
          showIndices, showHeadTail,
        })}
      </div>

      {current?.note && (
        <div style={{
          textAlign: "center", color: "#94a3b8", fontSize: 18,
          opacity: interpolate(progress, [0, 0.15], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>{current.note}</div>
      )}
    </div>
  );
};

function renderCells(args: {
  before: CellValue[]; after: CellValue[]; current: LinearOp; progress: number;
  kind: LinearStructureProps["kind"]; accent: string; theme: ReturnType<typeof useTheme>;
  cellW: number; cellH: number; gap: number;
  showIndices: boolean; showHeadTail: boolean;
}) {
  const { before, after, current, progress, kind, accent, theme, cellW, cellH, showIndices, showHeadTail } = args;

  // Compute display array & per-cell transform based on the op
  const cells: {
    value: CellValue; opacity: number;
    dx: number; dy: number; scale: number;
    highlight: boolean;
  }[] = [];

  const isInsertion =
    current.op === "push" || current.op === "push-back" ||
    current.op === "push-front" || current.op === "enqueue" ||
    current.op === "insert-at";

  const isRemoval =
    current.op === "pop" || current.op === "pop-back" ||
    current.op === "pop-front" || current.op === "dequeue" ||
    current.op === "delete-at";

  if (isInsertion) {
    // `after` has one more cell than `before`. Find the insert index.
    const insertIdx =
      current.op === "push" || current.op === "push-back" || current.op === "enqueue"
        ? before.length
        : current.op === "push-front"
        ? 0
        : (current.index ?? 0);
    for (let i = 0; i < after.length; i++) {
      const v = after[i];
      const isNew = i === insertIdx;
      if (isNew) {
        cells.push({
          value: v,
          opacity: interpolate(progress, [0.1, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          dx: 0, dy: kind === "stack" ? interpolate(progress, [0, 1], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
          scale: interpolate(progress, [0, 1], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          highlight: true,
        });
      } else {
        // Shift cells at/after insertIdx to make room, animated.
        const shifted = i > insertIdx;
        const dx = shifted ? interpolate(progress, [0, 1], [-(cellW + args.gap), 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
        cells.push({ value: v, opacity: 1, dx: kind === "stack" ? 0 : dx, dy: 0, scale: 1, highlight: false });
      }
    }
  } else if (isRemoval) {
    // Show `before` with the removed cell fading/scaling out.
    const removeIdx =
      current.op === "pop" || current.op === "pop-back"
        ? before.length - 1
        : current.op === "pop-front" || current.op === "dequeue"
        ? 0
        : (current.index ?? 0);
    for (let i = 0; i < before.length; i++) {
      const v = before[i];
      if (i === removeIdx) {
        cells.push({
          value: v,
          opacity: interpolate(progress, [0, 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          dx: 0, dy: kind === "stack" ? interpolate(progress, [0, 1], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
          scale: interpolate(progress, [0, 1], [1, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          highlight: true,
        });
      } else {
        const shifted = i > removeIdx;
        const dx = shifted && kind !== "stack"
          ? interpolate(progress, [0.4, 1], [0, -(cellW + args.gap)], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 0;
        cells.push({ value: v, opacity: 1, dx, dy: 0, scale: 1, highlight: false });
      }
    }
  } else if (current.op === "read") {
    for (let i = 0; i < before.length; i++) {
      cells.push({
        value: before[i], opacity: 1, dx: 0, dy: 0, scale: 1,
        highlight: i === (current.index ?? -1),
      });
    }
  } else {
    for (const v of before) cells.push({ value: v, opacity: 1, dx: 0, dy: 0, scale: 1, highlight: false });
  }

  return (
    <>
      {cells.map((c, i) => (
        <div key={i} style={{
          width: cellW, height: cellH,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: c.highlight ? mix("#1e293b", accent, 0.7) : "#1e293b",
          border: `2px solid ${c.highlight ? accent : "#334155"}`,
          borderRadius: kind === "linked-list" ? 20 : 8,
          color: "#f1f5f9", fontSize: 24, fontWeight: 700,
          opacity: c.opacity,
          translate: `${c.dx}px ${c.dy}px`,
          scale: c.scale,
          boxShadow: c.highlight ? `0 0 20px ${accent}70` : undefined,
          position: "relative",
        }}>
          {c.value}
          {kind === "linked-list" && i < cells.length - 1 && (
            <span style={{
              position: "absolute", right: -30, top: "50%", translate: "0 -50%",
              color: "#64748b", fontSize: 28,
            }}>→</span>
          )}
          {showIndices && kind === "array" && (
            <span style={{
              position: "absolute", bottom: -28, color: "#64748b", fontSize: 14,
            }}>{i}</span>
          )}
          {showHeadTail && kind !== "array" && kind !== "stack" && (
            <>
              {i === 0 && <span style={{ position: "absolute", top: -28, color: accent, fontSize: 14, fontWeight: 700 }}>HEAD</span>}
              {i === cells.length - 1 && <span style={{ position: "absolute", top: -28, right: 0, color: theme.primary, fontSize: 14, fontWeight: 700 }}>TAIL</span>}
            </>
          )}
          {kind === "stack" && i === cells.length - 1 && (
            <span style={{ position: "absolute", right: -60, color: accent, fontSize: 14, fontWeight: 700 }}>TOP →</span>
          )}
        </div>
      ))}
    </>
  );
}
