import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateSegmentTreeSteps, SegOperation } from "./SegmentTree.steps";

export const SegmentTreeSchema = z.object({
  title: z.string().optional(),
  values: z.array(z.number()),
  op: z.enum(["sum", "min", "max"]).optional(),
  operations: z.array(
    z.union([
      z.object({ op: z.literal("query"), lo: z.number(), hi: z.number() }),
      z.object({ op: z.literal("update"), index: z.number(), value: z.number() }),
    ]),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type SegmentTreeProps = z.infer<typeof SegmentTreeSchema>;

const NW = 74;
const NH = 46;

const fmt = (v: number) => (v === Infinity ? "∞" : v === -Infinity ? "-∞" : String(v));

export const SegmentTree: React.FC<SegmentTreeProps> = ({
  title,
  values,
  op = "sum",
  operations,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const { nodes, steps } = React.useMemo(
    () => generateSegmentTreeSteps(values, op, operations as SegOperation[]),
    [values, op, operations],
  );

  const stepFrames = Math.max(1, Math.round((1.0 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // In-order x, depth y — stable layout from the static structure.
  const has = React.useMemo(() => new Set(nodes.map((n) => n.idx)), [nodes]);
  const { xById, depthById, count, maxDepth } = React.useMemo(() => {
    const xMap = new Map<number, number>();
    const dMap = new Map<number, number>();
    let counter = 0;
    let md = 0;
    const walk = (i: number) => {
      if (!has.has(i)) return;
      walk(2 * i);
      const d = Math.floor(Math.log2(i));
      md = Math.max(md, d);
      dMap.set(i, d);
      xMap.set(i, counter++);
      walk(2 * i + 1);
    };
    walk(1);
    return { xById: xMap, depthById: dMap, count: counter, maxDepth: md };
  }, [has]);

  const padX = 90;
  const topPad = 150;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 130;
  const posOf = (i: number) => ({
    x: padX + (count <= 1 ? 0.5 : (xById.get(i) as number) / (count - 1)) * areaW,
    y: topPad + ((depthById.get(i) as number) + 0.5) / (maxDepth + 1) * areaH,
  });

  const active = new Set(step.active);
  const covered = new Set(step.covered);
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
            padding: "0 90px",
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>{op}</span>
        </h2>
      )}

      {step.result != null && (
        <div
          style={{
            position: "absolute",
            top: 62,
            right: 90,
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "monospace",
            color: "#22c55e",
          }}
        >
          {op} = {fmt(step.result)}
        </div>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {/* Edges */}
        {nodes.map((n) => {
          if (n.idx === 1) return null;
          const parent = Math.floor(n.idx / 2);
          const a = posOf(parent);
          const b = posOf(n.idx);
          return <line key={`e-${n.idx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#334155" strokeWidth={2} />;
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const c = posOf(n.idx);
          const isActive = active.has(n.idx);
          const isCovered = covered.has(n.idx);
          const val = step.values[n.idx];
          const fill = isActive
            ? mix("#1e293b", accent, 0.55 * glow)
            : isCovered
              ? mix("#1e293b", "#22c55e", 0.4)
              : "#1e293b";
          const border = isActive ? accent : isCovered ? "#22c55e" : "#475569";
          return (
            <g key={`n-${n.idx}`} transform={`translate(${c.x}, ${c.y})`}>
              <rect
                x={-NW / 2}
                y={-NH / 2}
                width={NW}
                height={NH}
                rx={8}
                fill={fill}
                stroke={border}
                strokeWidth={isActive ? 3 : 2}
                style={{ filter: isActive ? `drop-shadow(0 0 12px ${accent})` : undefined }}
              />
              <text textAnchor="middle" dy={-2} fill="#f1f5f9" fontSize={22} fontWeight={800}>
                {val === undefined ? "" : fmt(val)}
              </text>
              <text textAnchor="middle" dy={16} fill="#94a3b8" fontSize={12} fontWeight={600}>
                [{n.lo},{n.hi}]
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "visit-disjoint" ? "#94a3b8" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
