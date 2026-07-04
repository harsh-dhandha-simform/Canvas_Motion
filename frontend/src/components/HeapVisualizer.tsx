import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateHeapSteps, HeapOp } from "./HeapVisualizer.steps";

export const HeapVisualizerSchema = z.object({
  title: z.string().optional(),
  kind: z.enum(["min", "max"]).optional(),
  initial: z.array(z.number()),
  operations: z
    .array(
      z.union([
        z.object({ op: z.literal("insert"), value: z.number() }),
        z.object({ op: z.literal("extract") }),
      ]),
    )
    .optional(),
  showArray: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type HeapVisualizerProps = z.infer<typeof HeapVisualizerSchema>;

const NODE_R = 30;

// Complete-binary-tree layout: index i → (level, offset within level).
function heapLayout(n: number, w: number, h: number): { x: number; y: number }[] {
  if (n === 0) return [];
  const maxLevel = Math.floor(Math.log2(n));
  const pos: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const idxInLevel = i - (Math.pow(2, level) - 1);
    const count = Math.pow(2, level);
    pos.push({
      x: ((idxInLevel + 0.5) / count) * w,
      y: ((level + 0.5) / (maxLevel + 1)) * h,
    });
  }
  return pos;
}

export const HeapVisualizer: React.FC<HeapVisualizerProps> = ({
  title,
  kind = "min",
  initial,
  operations,
  showArray = true,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateHeapSteps(kind, initial, (operations ?? []) as HeapOp[]),
    [kind, initial, operations],
  );

  const stepFrames = Math.max(1, Math.round((0.9 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];
  const heap = step.heap;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Tree drawing area (leave room for title, caption, and optional array row).
  const padX = 90;
  const topPad = 150;
  const treeH = videoHeight - topPad - (showArray ? 240 : 160);
  const treeW = videoWidth - padX * 2;
  const pos = heapLayout(heap.length, treeW, treeH).map((p) => ({
    x: p.x + padX,
    y: p.y + topPad,
  }));

  const ease = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const isSwapping = step.swap !== undefined;
  // During a swap, value now resting at slot i arrived from slot `other`.
  const renderPos = (i: number): { x: number; y: number } => {
    if (isSwapping && step.swap) {
      const [a, b] = step.swap;
      if (i === a || i === b) {
        const other = i === a ? b : a;
        return {
          x: pos[other].x + (pos[i].x - pos[other].x) * ease,
          y: pos[other].y + (pos[i].y - pos[other].y) * ease,
        };
      }
    }
    return pos[i];
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: theme.background,
        fontFamily: `${theme.font}, sans-serif`,
        padding: "56px 0 0",
        boxSizing: "border-box",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 46,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.03em",
            margin: 0,
            padding: "0 90px",
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 26, marginLeft: 16, fontWeight: 700 }}>
            {kind}-heap
          </span>
        </h2>
      )}

      <svg
        width={videoWidth}
        height={treeH + topPad}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Edges parent → child */}
        {heap.map((_, i) => {
          if (i === 0) return null;
          const p = Math.floor((i - 1) / 2);
          const a = renderPos(p);
          const b = renderPos(i);
          const onPath = step.active.includes(i) && step.active.includes(p);
          return (
            <line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={onPath ? accent : "#334155"}
              strokeWidth={onPath ? 4 : 2}
            />
          );
        })}

        {/* Nodes */}
        {heap.map((v, i) => {
          const c = renderPos(i);
          const active = step.active.includes(i);
          const justInserted = step.kind === "insert" && i === heap.length - 1;
          const enter = justInserted
            ? interpolate(progress, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.back(1.6)),
              })
            : 1;
          const fill = active ? mix("#1e293b", accent, 0.55) : "#1e293b";
          const border = active ? accent : "#475569";
          return (
            <g key={`n-${i}`} transform={`translate(${c.x}, ${c.y}) scale(${enter})`}>
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={3}
                style={{ filter: active ? `drop-shadow(0 0 12px ${accent})` : undefined }}
              />
              <text
                textAnchor="middle"
                dy={7}
                fill="#f1f5f9"
                fontSize={22}
                fontWeight={800}
              >
                {v}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Array view */}
      {showArray && (
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {heap.map((v, i) => {
            const active = step.active.includes(i);
            return (
              <div
                key={`a-${i}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    background: active ? mix("#1e293b", accent, 0.55) : "#1e293b",
                    border: `2px solid ${active ? accent : "#475569"}`,
                  }}
                >
                  {v}
                </div>
                <span style={{ fontSize: 14, color: "#64748b" }}>{i}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
