import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateBTreeSteps, BTreeSnapNode } from "./BTreeVisualizer.steps";

export const BTreeVisualizerSchema = z.object({
  title: z.string().optional(),
  order: z.number().optional(),
  values: z.array(z.number()),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type BTreeVisualizerProps = z.infer<typeof BTreeVisualizerSchema>;

const KEY_W = 46;
const NODE_H = 50;

type Placed = { path: number[]; keys: number[]; x: number; depth: number };

function placeTree(root: BTreeSnapNode | null): { placed: Placed[]; leaves: number; maxDepth: number } {
  const placed: Placed[] = [];
  let leaves = 0;
  let maxDepth = 0;
  const walk = (node: BTreeSnapNode, depth: number, path: number[]): number => {
    maxDepth = Math.max(maxDepth, depth);
    let x: number;
    if (node.children.length === 0) {
      x = leaves++;
    } else {
      const xs = node.children.map((c, i) => walk(c, depth + 1, [...path, i]));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    placed.push({ path, keys: node.keys, x, depth });
    return x;
  };
  if (root) walk(root, 0, []);
  return { placed, leaves, maxDepth };
}

const samePath = (a: number[] | null, b: number[]) =>
  a !== null && a.length === b.length && a.every((v, i) => v === b[i]);

export const BTreeVisualizer: React.FC<BTreeVisualizerProps> = ({
  title,
  order = 3,
  values,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(() => generateBTreeSteps(order, values), [order, values]);

  const stepFrames = Math.max(1, Math.round((1.0 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const { placed, leaves, maxDepth } = placeTree(step.root);
  const padX = 120;
  const topPad = 170;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 120;
  const total = Math.max(1, leaves - 1);
  const posOf = (p: Placed) => ({
    x: padX + (leaves <= 1 ? 0.5 : p.x / total) * areaW,
    y: topPad + (p.depth + 0.5) / (maxDepth + 1) * areaH,
  });

  const byPath = new Map(placed.map((p) => [p.path.join("."), p]));

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
            padding: "0 120px",
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>order {order}</span>
        </h2>
      )}

      {/* Edges */}
      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {placed.map((p) => {
          if (p.path.length === 0) return null;
          const parent = byPath.get(p.path.slice(0, -1).join("."));
          if (!parent) return null;
          const a = posOf(parent);
          const b = posOf(p);
          return <line key={`e-${p.path.join(".")}`} x1={a.x} y1={a.y + NODE_H / 2} x2={b.x} y2={b.y - NODE_H / 2} stroke="#334155" strokeWidth={2} />;
        })}
      </svg>

      {/* Nodes */}
      {placed.map((p) => {
        const c = posOf(p);
        const isActive = samePath(step.activePath, p.path);
        const nodeW = Math.max(1, p.keys.length) * KEY_W;
        return (
          <div
            key={`n-${p.path.join(".")}`}
            style={{
              position: "absolute",
              left: c.x - nodeW / 2,
              top: c.y - NODE_H / 2,
              width: nodeW,
              height: NODE_H,
              display: "flex",
              borderRadius: 8,
              overflow: "hidden",
              border: `2px solid ${isActive ? accent : "#475569"}`,
              boxShadow: isActive ? `0 0 16px ${accent}${Math.round(glow * 90).toString(16).padStart(2, "0")}` : undefined,
            }}
          >
            {p.keys.map((k, ki) => {
              const keyActive = isActive && step.activeKeys.includes(ki);
              return (
                <div
                  key={ki}
                  style={{
                    width: KEY_W,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    background: keyActive ? mix("#1e293b", accent, 0.6) : "#1e293b",
                    borderRight: ki < p.keys.length - 1 ? "1px solid #475569" : undefined,
                  }}
                >
                  {k}
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "split" ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
