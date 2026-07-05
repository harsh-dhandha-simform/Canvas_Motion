import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateSccSteps, SccNode, SccEdge } from "./StronglyConnectedComponents.steps";

export const StronglyConnectedComponentsSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(z.object({ id: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type StronglyConnectedComponentsProps = z.infer<typeof StronglyConnectedComponentsSchema>;

const NODE_R = 34;
const COMP_COLORS = ["#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444"];

export const StronglyConnectedComponents: React.FC<StronglyConnectedComponentsProps> = ({
  title,
  nodes,
  edges,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateSccSteps(nodes as SccNode[], edges as SccEdge[]),
    [nodes, edges],
  );

  const stepFrames = Math.max(1, Math.round((0.8 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const padX = 150;
  const topPad = 150;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 130;
  const px = (x: number) => padX + (x / 100) * areaW;
  const py = (y: number) => topPad + (y / 100) * areaH;
  const posById = new Map(step.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  const onStack = new Set(step.onStack);
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
            padding: "0 150px",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="scc-head" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L9,3 L0,6 Z" fill="#64748b" />
          </marker>
          <marker id="scc-head-a" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L9,3 L0,6 Z" fill={accent} />
          </marker>
        </defs>

        {step.edges.map((e, i) => {
          const a = posById.get(e.from);
          const b = posById.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const active = step.activeEdge && step.activeEdge[0] === e.from && step.activeEdge[1] === e.to;
          return (
            <line
              key={i}
              x1={a.x + ux * NODE_R}
              y1={a.y + uy * NODE_R}
              x2={b.x - ux * (NODE_R + 8)}
              y2={b.y - uy * (NODE_R + 8)}
              stroke={active ? accent : "#475569"}
              strokeWidth={active ? 4.5 : 2.5}
              markerEnd={active ? "url(#scc-head-a)" : "url(#scc-head)"}
            />
          );
        })}

        {step.nodes.map((n) => {
          const p = posById.get(n.id) as { x: number; y: number };
          const compId = step.comp[n.id];
          const hasComp = compId !== undefined;
          const isCurrent = step.current === n.id;
          const stacked = onStack.has(n.id);
          const compColor = hasComp ? COMP_COLORS[compId % COMP_COLORS.length] : null;
          const fill = isCurrent
            ? mix("#1e293b", accent, 0.55 * glow)
            : compColor
              ? mix("#1e293b", compColor, 0.5)
              : stacked
                ? mix("#1e293b", "#38bdf8", 0.3)
                : "#1e293b";
          const border = isCurrent ? accent : compColor ?? (stacked ? "#38bdf8" : "#475569");
          const iv = step.index[n.id];
          const lv = step.low[n.id];
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle r={NODE_R} fill={fill} stroke={border} strokeWidth={3} style={{ filter: isCurrent ? `drop-shadow(0 0 12px ${accent})` : undefined }} />
              <text textAnchor="middle" dy={2} fill="#f8fafc" fontSize={22} fontWeight={800}>{n.id}</text>
              {iv !== undefined && (
                <text textAnchor="middle" dy={NODE_R + 22} fill="#94a3b8" fontSize={15} fontWeight={700}>
                  {iv}/{lv}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* stack panel */}
      <div style={{ position: "absolute", left: 40, bottom: 110, display: "flex", flexDirection: "column-reverse", gap: 6 }}>
        <div style={{ color: "#38bdf8", fontSize: 16, fontWeight: 800, marginTop: 6 }}>stack</div>
        {step.onStack.map((s) => (
          <div key={s} style={{ width: 60, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: mix("#1e293b", "#38bdf8", 0.35), border: "2px solid #38bdf8", color: "#f1f5f9", fontSize: 18, fontWeight: 800 }}>
            {s}
          </div>
        ))}
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
          color: step.kind === "scc" ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
