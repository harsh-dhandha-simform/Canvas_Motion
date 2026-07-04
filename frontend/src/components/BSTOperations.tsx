import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateBSTSteps, BSTOp, BSTSnapNode } from "./BSTOperations.steps";

export const BSTOperationsSchema = z.object({
  title: z.string().optional(),
  initial: z.array(z.number()),
  operations: z.array(
    z.object({
      op: z.enum(["insert", "search", "delete"]),
      value: z.number(),
    }),
  ),
  balance: z.enum(["none", "avl"]).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type BSTOperationsProps = z.infer<typeof BSTOperationsSchema>;

const NODE_R = 28;

function treeDepth(n?: BSTSnapNode): number {
  if (!n) return 0;
  return 1 + Math.max(treeDepth(n.left), treeDepth(n.right));
}

// In-order x, depth y — normalized to 0..1. `levels` is shared across all steps
// so a node at a given depth keeps a stable vertical position.
function layout(root: BSTSnapNode | null, levels: number): Map<number, { x: number; y: number }> {
  const order: { key: number; depth: number }[] = [];
  const walk = (n: BSTSnapNode | undefined, depth: number) => {
    if (!n) return;
    walk(n.left, depth + 1);
    order.push({ key: n.key, depth });
    walk(n.right, depth + 1);
  };
  walk(root ?? undefined, 0);
  const count = order.length;
  const total = Math.max(1, count - 1);
  const map = new Map<number, { x: number; y: number }>();
  order.forEach((o, i) => {
    map.set(o.key, {
      x: count <= 1 ? 0.5 : i / total,
      y: (o.depth + 0.5) / levels,
    });
  });
  return map;
}

function edgesOf(root: BSTSnapNode | null): { parent: number; child: number }[] {
  const out: { parent: number; child: number }[] = [];
  const walk = (n?: BSTSnapNode) => {
    if (!n) return;
    if (n.left) {
      out.push({ parent: n.key, child: n.left.key });
      walk(n.left);
    }
    if (n.right) {
      out.push({ parent: n.key, child: n.right.key });
      walk(n.right);
    }
  };
  walk(root ?? undefined);
  return out;
}

export const BSTOperations: React.FC<BSTOperationsProps> = ({
  title,
  initial,
  operations,
  balance = "none",
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateBSTSteps(initial, operations as BSTOp[], balance),
    [initial, operations, balance],
  );

  const levels = React.useMemo(
    () => Math.max(1, ...steps.map((s) => treeDepth(s.root ?? undefined))),
    [steps],
  );

  const stepFrames = Math.max(1, Math.round((1.0 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];
  const prev = idx > 0 ? steps[idx - 1] : step;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const padX = 110;
  const topPad = 160;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 120;

  const t = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const layCurr = layout(step.root, levels);
  const layPrev = layout(prev.root, levels);
  const active = new Set(step.active);

  const stateColor =
    step.kind === "found"
      ? "#22c55e"
      : step.kind === "miss" || step.kind === "delete"
        ? "#ef4444"
        : step.kind === "rotate-left" || step.kind === "rotate-right"
          ? theme.primary
          : accent;

  const lerp = (a: number, b: number) => a + (b - a) * t;
  const posOf = (key: number): { x: number; y: number; isNew: boolean } | null => {
    const c = layCurr.get(key);
    if (!c) return null;
    const p = layPrev.get(key) ?? c;
    const isNew = !layPrev.has(key);
    return {
      x: padX + lerp(p.x, c.x) * areaW,
      y: topPad + lerp(p.y, c.y) * areaH,
      isNew,
    };
  };

  const edges = edgesOf(step.root);

  // Nodes present last step but gone now → fade them out (deletions).
  const removedKeys =
    step.kind === "delete"
      ? [...layPrev.keys()].filter((k) => !layCurr.has(k))
      : [];

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
            padding: "0 110px",
            opacity: titleOpacity,
          }}
        >
          {title}
          {balance === "avl" && (
            <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>
              AVL
            </span>
          )}
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {/* Edges */}
        {edges.map((e) => {
          const a = posOf(e.parent);
          const b = posOf(e.child);
          if (!a || !b) return null;
          const opacity = b.isNew ? t : 1;
          return (
            <line
              key={`e-${e.parent}-${e.child}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#475569"
              strokeWidth={2.5}
              opacity={opacity}
            />
          );
        })}

        {/* Fading (deleted) nodes */}
        {removedKeys.map((k) => {
          const p = layPrev.get(k);
          if (!p) return null;
          return (
            <g
              key={`rm-${k}`}
              transform={`translate(${padX + p.x * areaW}, ${topPad + p.y * areaH})`}
              opacity={1 - t}
            >
              <circle r={NODE_R} fill="#1e293b" stroke="#ef4444" strokeWidth={3} />
              <text textAnchor="middle" dy={7} fill="#f1f5f9" fontSize={22} fontWeight={800}>
                {k}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {[...layCurr.keys()].map((k) => {
          const c = posOf(k);
          if (!c) return null;
          const isActive = active.has(k);
          const scale = c.isNew
            ? interpolate(progress, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.back(1.6)),
              })
            : 1;
          const fill = isActive ? mix("#1e293b", stateColor, 0.55) : "#1e293b";
          const border = isActive ? stateColor : "#475569";
          return (
            <g key={`n-${k}`} transform={`translate(${c.x}, ${c.y}) scale(${scale})`}>
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={3}
                style={{ filter: isActive ? `drop-shadow(0 0 12px ${stateColor})` : undefined }}
              />
              <text textAnchor="middle" dy={7} fill="#f1f5f9" fontSize={22} fontWeight={800}>
                {k}
              </text>
            </g>
          );
        })}
      </svg>

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
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
