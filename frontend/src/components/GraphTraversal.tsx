import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps } from "./_shared/anim";
import { generateGraphSteps } from "./GraphTraversal.steps";

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  x: z.number(),
  y: z.number(),
});

const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
});

export const GraphStepSchema = z.object({
  kind: z.enum([
    "visit", "enqueue", "relax", "settle",
    "mst-select", "mst-reject", "topo-emit",
  ]),
  node: z.string().optional(),
  edge: z.object({ from: z.string(), to: z.string() }).optional(),
  distance: z.number().optional(),
  note: z.string().optional(),
});

export const GraphTraversalSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum([
    "dfs", "bfs", "dijkstra", "bellman-ford",
    "topo-sort", "mst-prim", "mst-kruskal",
  ]),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  start: z.string().optional(),
  steps: z.array(GraphStepSchema).optional(),
  showDistanceTable: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type GraphStep = z.infer<typeof GraphStepSchema>;
export type GraphTraversalProps = z.infer<typeof GraphTraversalSchema>;

export const GraphTraversal: React.FC<GraphTraversalProps> = ({
  title, algorithm, nodes, edges, start,
  steps: explicitSteps, showDistanceTable, speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateGraphSteps(algorithm, nodes, edges, start)
  );
  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const entranceFrames = 24;
  const stepsStartFrame = entranceFrames + 6;
  const currentIdx = Math.max(-1, Math.min(steps.length - 1,
    Math.floor((frame - stepsStartFrame) / stepFrames)));
  const stepProgress = frame >= stepsStartFrame
    ? stepAt(currentIdx, { stepFrames, frame: frame - stepsStartFrame, fps }).progress
    : 0;

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Aggregate node/edge states from all steps up to and including currentIdx
  const nodeState = new Map<string, "unvisited" | "frontier" | "visited" | "settled" | "topo">();
  const edgeState = new Map<string, "neutral" | "traversed" | "relaxed" | "mst" | "rejected">();
  const distance = new Map<string, number>();
  const topoOrder: string[] = [];

  if (steps.length > 0) {
    for (let i = 0; i <= currentIdx; i++) {
      const s = steps[i];
      if (s.kind === "visit" && s.node) nodeState.set(s.node, "visited");
      if (s.kind === "enqueue" && s.edge) {
        const k = edgeKey(s.edge.from, s.edge.to);
        edgeState.set(k, "traversed");
        if (nodeState.get(s.edge.to) !== "visited") nodeState.set(s.edge.to, "frontier");
      }
      if (s.kind === "relax" && s.edge && s.node) {
        edgeState.set(edgeKey(s.edge.from, s.edge.to), "relaxed");
        if (typeof s.distance === "number") distance.set(s.node, s.distance);
        if (nodeState.get(s.node) !== "settled") nodeState.set(s.node, "frontier");
      }
      if (s.kind === "settle" && s.node) {
        nodeState.set(s.node, "settled");
        if (typeof s.distance === "number") distance.set(s.node, s.distance);
      }
      if (s.kind === "mst-select" && s.edge) edgeState.set(edgeKey(s.edge.from, s.edge.to), "mst");
      if (s.kind === "mst-reject" && s.edge) edgeState.set(edgeKey(s.edge.from, s.edge.to), "rejected");
      if (s.kind === "topo-emit" && s.node) { nodeState.set(s.node, "topo"); topoOrder.push(s.node); }
    }
  }

  // Colours
  const nodeColour = (id: string) => {
    const st = nodeState.get(id) ?? "unvisited";
    if (st === "unvisited") return { fill: "#1e293b", border: "#334155" };
    if (st === "frontier") return { fill: mix("#1e293b", theme.primary, 0.6), border: theme.primary };
    if (st === "visited") return { fill: mix("#1e293b", theme.secondary, 0.5), border: theme.secondary };
    if (st === "settled") return { fill: mix("#1e293b", theme.secondary, 0.7), border: theme.secondary };
    return { fill: mix("#1e293b", theme.secondary, 0.6), border: theme.secondary };
  };

  const edgeColour = (from: string, to: string) => {
    const st = edgeState.get(edgeKey(from, to)) ?? "neutral";
    if (st === "mst") return { stroke: accent, width: 4 };
    if (st === "rejected") return { stroke: "#ef4444", width: 2 };
    if (st === "relaxed") return { stroke: accent, width: 3 };
    if (st === "traversed") return { stroke: theme.primary, width: 2.5 };
    return { stroke: "#334155", width: 2 };
  };

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      padding: "60px 80px", boxSizing: "border-box",
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <svg width="100%" height="100%" style={{
        position: "absolute", inset: 0, marginTop: 100,
      }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeById.get(e.from), to = nodeById.get(e.to);
          if (!from || !to) return null;
          const { stroke, width: strokeW } = edgeColour(e.from, e.to);
          const entrance = interpolate(frame, [0, entranceFrames], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const dx = to.x - from.x, dy = to.y - from.y;
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${from.x + dx * entrance}%`}
                y2={`${from.y + dy * entrance}%`}
                stroke={stroke} strokeWidth={strokeW} strokeLinecap="round"
              />
              {typeof e.weight === "number" && (
                <g transform={`translate(${mx / 100 * width}, ${my / 100 * height})`} opacity={entrance}>
                  <rect x={-16} y={-14} width={32} height={22} rx={11}
                    fill="#0f172a" stroke="#334155" strokeWidth={1} />
                  <text textAnchor="middle" dy={4} fill="#e2e8f0" fontSize={14} fontWeight={700}>
                    {e.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const { fill, border } = nodeColour(n.id);
          const enter = interpolate(
            frame, [i * 3, i * 3 + entranceFrames], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const isCurrentTarget = steps[currentIdx]?.node === n.id;
          const pulse = isCurrentTarget
            ? 1 + 0.15 * Math.sin(stepProgress * Math.PI)
            : 1;
          const nodeX = n.x / 100 * width;
          const nodeY = n.y / 100 * height;
          return (
            <g key={n.id}
              transform={`translate(${nodeX}, ${nodeY})`}
              opacity={enter}
            >
              <circle r={28 * pulse} fill={fill} stroke={border} strokeWidth={3} />
              <text textAnchor="middle" dy={5} fill="#f1f5f9" fontSize={18} fontWeight={800}>
                {n.label ?? n.id}
              </text>
              {distance.has(n.id) && (
                <text textAnchor="middle" dy={50} fill={accent} fontSize={14} fontWeight={700}>
                  d={distance.get(n.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Distance table (right column) */}
      {showDistanceTable && (algorithm === "dijkstra" || algorithm === "bellman-ford") && (
        <div style={{
          position: "absolute", top: 140, right: 80,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 12,
          padding: 20, minWidth: 200,
        }}>
          <h3 style={{ color: "#f1f5f9", fontSize: 18, margin: "0 0 12px 0" }}>Distances</h3>
          {nodes.map(n => (
            <div key={n.id} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: "1px solid #1e293b",
              color: "#f1f5f9", fontSize: 16,
            }}>
              <span>{n.label ?? n.id}</span>
              <strong style={{ color: accent }}>
                {distance.has(n.id) ? distance.get(n.id) : "∞"}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Topological order lane */}
      {algorithm === "topo-sort" && topoOrder.length > 0 && (
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 10,
        }}>
          {topoOrder.map((id, i) => (
            <div key={i} style={{
              padding: "8px 16px", background: theme.secondary,
              color: "#0a0e1a", borderRadius: 8, fontSize: 16, fontWeight: 700,
            }}>{nodeById.get(id)?.label ?? id}</div>
          ))}
        </div>
      )}
    </div>
  );
};
