import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateFlowSteps, FlowNode, FlowEdgeInput } from "./FlowNetwork.steps";

export const FlowNetworkSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(z.object({ id: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), capacity: z.number() })),
  source: z.string(),
  sink: z.string(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type FlowNetworkProps = z.infer<typeof FlowNetworkSchema>;

const NODE_R = 34;

export const FlowNetwork: React.FC<FlowNetworkProps> = ({
  title,
  nodes,
  edges,
  source,
  sink,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateFlowSteps(nodes as FlowNode[], edges as FlowEdgeInput[], source, sink),
    [nodes, edges, source, sink],
  );

  const stepFrames = Math.max(1, Math.round((1.3 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const padX = 130;
  const topPad = 150;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 130;
  const px = (x: number) => padX + (x / 100) * areaW;
  const py = (y: number) => topPad + (y / 100) * areaH;
  const posById = new Map(step.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  const pathPairs = new Set<string>();
  for (let i = 0; i + 1 < step.pathNodes.length; i++) pathPairs.add(`${step.pathNodes[i]}|${step.pathNodes[i + 1]}`);

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const done = step.kind === "done" || step.kind === "settle";

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
            padding: "0 130px",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          position: "absolute",
          top: 62,
          right: 130,
          fontSize: 30,
          fontWeight: 800,
          fontFamily: "monospace",
          color: done ? "#22c55e" : accent,
        }}
      >
        max flow = {step.maxFlow}
      </div>

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="fn-head" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L9,3 L0,6 Z" fill="#64748b" />
          </marker>
          <marker id="fn-head-a" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L9,3 L0,6 Z" fill={accent} />
          </marker>
        </defs>

        {step.edges.map((e) => {
          const a = posById.get(e.from);
          const b = posById.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const sx = a.x + ux * NODE_R;
          const sy = a.y + uy * NODE_R;
          const ex = b.x - ux * (NODE_R + 8);
          const ey = b.y - uy * (NODE_R + 8);
          const onPath = pathPairs.has(`${e.from}|${e.to}`);
          const saturated = e.flow >= e.cap && e.cap > 0;
          const color = onPath ? accent : saturated ? "#f59e0b" : "#64748b";
          const mx = (sx + ex) / 2 - uy * 20;
          const my = (sy + ey) / 2 + ux * 20;
          return (
            <g key={`${e.from}-${e.to}`}>
              <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={color}
                strokeWidth={onPath ? 5 : 3}
                markerEnd={onPath ? "url(#fn-head-a)" : "url(#fn-head)"}
              />
              <text x={mx} y={my} textAnchor="middle" fill={e.flow > 0 ? "#f8fafc" : "#94a3b8"} fontSize={20} fontWeight={800}>
                {e.flow}/{e.cap}
              </text>
            </g>
          );
        })}

        {step.nodes.map((n) => {
          const p = posById.get(n.id) as { x: number; y: number };
          const onPath = step.pathNodes.includes(n.id);
          const isEnd = n.id === source || n.id === sink;
          const fill = onPath ? mix("#1e293b", accent, 0.55 * glow) : isEnd ? mix("#1e293b", "#3b82f6", 0.5) : "#1e293b";
          const border = onPath ? accent : isEnd ? "#3b82f6" : "#475569";
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle r={NODE_R} fill={fill} stroke={border} strokeWidth={3} style={{ filter: onPath ? `drop-shadow(0 0 12px ${accent})` : undefined }} />
              <text textAnchor="middle" dy={8} fill="#f8fafc" fontSize={24} fontWeight={800}>
                {n.id === source ? "S" : n.id === sink ? "T" : n.id}
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
          color: done ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
