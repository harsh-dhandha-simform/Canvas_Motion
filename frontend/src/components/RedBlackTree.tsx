import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { stepAt } from "./_shared/anim";
import { generateRedBlackSteps, RBSnapNode } from "./RedBlackTree.steps";

export const RedBlackTreeSchema = z.object({
  title: z.string().optional(),
  values: z.array(z.number()),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type RedBlackTreeProps = z.infer<typeof RedBlackTreeSchema>;

const NODE_R = 28;

function treeDepth(n?: RBSnapNode): number {
  if (!n) return 0;
  return 1 + Math.max(treeDepth(n.left), treeDepth(n.right));
}

function layout(root: RBSnapNode | null, levels: number): Map<number, { x: number; y: number }> {
  const order: { key: number; depth: number }[] = [];
  const walk = (n: RBSnapNode | undefined, depth: number) => {
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
    map.set(o.key, { x: count <= 1 ? 0.5 : i / total, y: (o.depth + 0.5) / levels });
  });
  return map;
}

function colorsOf(root: RBSnapNode | null): Map<number, "R" | "B"> {
  const m = new Map<number, "R" | "B">();
  const walk = (n?: RBSnapNode) => {
    if (!n) return;
    m.set(n.key, n.color);
    walk(n.left);
    walk(n.right);
  };
  walk(root ?? undefined);
  return m;
}

function edgesOf(root: RBSnapNode | null): { parent: number; child: number }[] {
  const out: { parent: number; child: number }[] = [];
  const walk = (n?: RBSnapNode) => {
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

export const RedBlackTree: React.FC<RedBlackTreeProps> = ({
  title,
  values,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(() => generateRedBlackSteps([], values), [values]);
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
  const colors = colorsOf(step.root);
  const active = new Set(step.active);

  const lerp = (a: number, b: number) => a + (b - a) * t;
  const posOf = (key: number): { x: number; y: number; isNew: boolean } | null => {
    const c = layCurr.get(key);
    if (!c) return null;
    const p = layPrev.get(key) ?? c;
    return { x: padX + lerp(p.x, c.x) * areaW, y: topPad + lerp(p.y, c.y) * areaH, isNew: !layPrev.has(key) };
  };

  const edges = edgesOf(step.root);

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
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {edges.map((e) => {
          const a = posOf(e.parent);
          const b = posOf(e.child);
          if (!a || !b) return null;
          return (
            <line
              key={`e-${e.parent}-${e.child}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#475569"
              strokeWidth={2.5}
              opacity={b.isNew ? t : 1}
            />
          );
        })}

        {[...layCurr.keys()].map((k) => {
          const c = posOf(k);
          if (!c) return null;
          const isActive = active.has(k);
          const red = colors.get(k) === "R";
          const scale = c.isNew
            ? interpolate(progress, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.back(1.6)),
              })
            : 1;
          const fill = red ? "#b91c1c" : "#0b1220";
          const border = isActive ? accent : red ? "#f87171" : "#64748b";
          return (
            <g key={`n-${k}`} transform={`translate(${c.x}, ${c.y}) scale(${scale})`}>
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={isActive ? 4 : 3}
                style={{ filter: isActive ? `drop-shadow(0 0 12px ${accent})` : undefined }}
              />
              <text textAnchor="middle" dy={7} fill="#f8fafc" fontSize={22} fontWeight={800}>
                {k}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ position: "absolute", top: 66, right: 110, display: "flex", gap: 20, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#f1f5f9", fontSize: 18 }}>
          <span style={{ width: 18, height: 18, borderRadius: 9, background: "#b91c1c", border: "2px solid #f87171" }} /> red
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#f1f5f9", fontSize: 18 }}>
          <span style={{ width: 18, height: 18, borderRadius: 9, background: "#0b1220", border: "2px solid #64748b" }} /> black
        </span>
      </div>

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
