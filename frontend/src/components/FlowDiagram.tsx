import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const FlowDiagramSchema = z.object({
  title: z.string().optional(),
  /** Nodes in the flow. */
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      /** "process" | "decision" | "start" | "end" */
      kind: z.enum(["process", "decision", "start", "end"]).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    })
  ),
  /** Directed connections between nodes. */
  edges: z.array(
    z.object({
      fromId: z.string(),
      toId: z.string(),
      label: z.string().optional(),
      /** If true, the edge is highlighted (latest/active flow). */
      active: z.boolean().optional(),
    })
  ),
  accentColor: z.string().optional(),
});

export type FlowDiagramProps = z.infer<typeof FlowDiagramSchema>;

const KIND_COLORS = {
  process: "#38BDF8",
  decision: "#f59e0b",
  start: "#34d399",
  end: "#f472b6",
};

const KIND_SHAPES = {
  process: "rect",
  decision: "diamond",
  start: "pill",
  end: "pill",
};

/**
 * Sugiyama-style layered layout:
 *  - Compute each node's depth (longest path from a "start" node).
 *  - Within a layer, order nodes to reduce crossings (simple: keep input order).
 *  - Assign y by depth, x evenly within the layer.
 */
function layout(nodes: FlowDiagramProps["nodes"], edges: FlowDiagramProps["edges"]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency for indegree + forward
  const indeg = new Map<string, number>();
  const fwd = new Map<string, string[]>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    fwd.set(n.id, []);
  });
  edges.forEach((e) => {
    if (byId.has(e.fromId) && byId.has(e.toId)) {
      fwd.get(e.fromId)!.push(e.toId);
      indeg.set(e.toId, (indeg.get(e.toId) || 0) + 1);
    }
  });

  // Topological depth using Kahn's algorithm with tie-breaking on input order.
  const order = nodes.map((n) => n.id);
  const depth = new Map<string, number>();
  order.forEach((id) => depth.set(id, 0));

  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    edges.forEach((e) => {
      const d = (depth.get(e.toId) || 0);
      const cand = (depth.get(e.fromId) || 0) + 1;
      if (cand > d) {
        depth.set(e.toId, cand);
        changed = true;
      }
    });
    if (!changed) break;
  }

  // Group by depth
  const layers = new Map<number, string[]>();
  let maxDepth = 0;
  nodes.forEach((n) => {
    const d = depth.get(n.id) || 0;
    maxDepth = Math.max(maxDepth, d);
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(n.id);
  });

  // Layout positions
  const PAD_X = 140;
  const PAD_Y = 130;
  const CANVAS_W = 1920 - 2 * PAD_X;
  const CANVAS_H = 1080 - 2 * PAD_Y;

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((ids, layerIdx) => {
    const layerCount = layers.size;
    const y = PAD_Y + (CANVAS_H * layerIdx) / Math.max(1, layerCount - 1);
    const slotW = CANVAS_W / (ids.length + 1);
    ids.forEach((id, i) => {
      positions.set(id, { x: PAD_X + slotW * (i + 1), y });
    });
  });

  return { positions, depth, maxDepth };
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  title,
  nodes,
  edges,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeNodes = nodes ?? [];
  const safeEdges = edges ?? [];

  const { positions } = layout(safeNodes, safeEdges);

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Reveal nodes by depth first
  const nodeSprings = new Map<string, number>();
  safeNodes.forEach((n) => {
    // depth is implicit in position.y — derive index
    // We'll just stagger by index in input order — simpler and stable
    const idx = safeNodes.findIndex((x) => x.id === n.id);
    nodeSprings.set(
      n.id,
      spring({
        frame: frame - (10 + idx * 8),
        fps,
        config: { damping: 14, stiffness: 140 },
        durationInFrames: 30,
      })
    );
  });

  const edgeSprings = safeEdges.map((_, i) =>
    spring({
      frame: frame - (10 + safeNodes.length * 8 + i * 6),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  const renderShape = (n: typeof safeNodes[0], x: number, y: number) => {
    const sp = nodeSprings.get(n.id) || 0;
    const color = n.color || KIND_COLORS[n.kind || "process"];
    const scale = interpolate(sp, [0, 1], [0.6, 1]);
    const shape = KIND_SHAPES[n.kind || "process"];

    if (shape === "diamond") {
      return (
        <g
          transform={`translate(${x}, ${y}) scale(${scale})`}
          style={{ opacity: sp, transformOrigin: `${x}px ${y}px` }}
        >
          <polygon
            points={`0,-60 90,0 0,60 -90,0`}
            fill="#0f1729"
            stroke={color}
            strokeWidth={3}
            style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
          />
          <text
            x={0}
            y={6}
            textAnchor="middle"
            fill={color}
            fontSize={18}
            fontWeight={800}
            fontFamily="Inter, sans-serif"
          >
            {n.label}
          </text>
        </g>
      );
    }

    if (shape === "pill") {
      const w = Math.max(120, n.label.length * 12 + 40);
      return (
        <g
          transform={`translate(${x}, ${y}) scale(${scale})`}
          style={{ opacity: sp, transformOrigin: `${x}px ${y}px` }}
        >
          <rect
            x={-w / 2}
            y={-28}
            width={w}
            height={56}
            rx={28}
            fill="#0f1729"
            stroke={color}
            strokeWidth={3}
            style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
          />
          <text
            x={0}
            y={6}
            textAnchor="middle"
            fill={color}
            fontSize={20}
            fontWeight={800}
            fontFamily="Inter, sans-serif"
          >
            {n.label}
          </text>
        </g>
      );
    }

    // Default: process (rounded rect)
    const w = 180;
    const h = 70;
    return (
      <g
        transform={`translate(${x}, ${y}) scale(${scale})`}
        style={{ opacity: sp, transformOrigin: `${x}px ${y}px` }}
      >
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={12}
          fill="#0f1729"
          stroke={color}
          strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
        <text
          x={0}
          y={n.description ? -4 : 6}
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize={18}
          fontWeight={800}
          fontFamily="Inter, sans-serif"
        >
          {n.label}
        </text>
        {n.description && (
          <text
            x={0}
            y={16}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={11}
            fontFamily="Fira Code, monospace"
          >
            {n.description}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "40px 60px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 8,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}
      <p
        style={{
          color: "#94a3b8",
          fontSize: 17,
          margin: 0,
          marginBottom: 12,
          textAlign: "center",
          opacity: titleOpacity,
        }}
      >
        Branching flow — diamonds are decisions, pills are start/end points.
      </p>

      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1920 1080"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
            <marker
              id="flow-arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={accentColor} />
            </marker>
          </defs>

          {/* Edges */}
          {safeEdges.map((e, i) => {
            const from = positions.get(e.fromId);
            const to = positions.get(e.toId);
            if (!from || !to) return null;
            const sp = edgeSprings[i];
            const isActive = !!e.active;
            const color = isActive ? accentColor : "#94a3b8";
            const opacity = sp * (isActive ? 1 : 0.7);

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / dist;
            const uy = dy / dist;

            // Pull endpoints back so arrowheads don't enter shape bounds
            const PAD = 60;
            const x1 = from.x + ux * PAD;
            const y1 = from.y + uy * PAD;
            const x2 = to.x - ux * PAD;
            const y2 = to.y - uy * PAD;

            // Curved path with vertical-bias control
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const pathLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) + 80;

            return (
              <g key={`e-${i}`} opacity={opacity}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 4 : 2.5}
                  strokeDasharray={pathLen}
                  strokeDashoffset={pathLen * (1 - sp)}
                  markerEnd={isActive ? "url(#flow-arrow-active)" : "url(#flow-arrow)"}
                  style={{
                    filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined,
                  }}
                />
                {e.label && (
                  <g transform={`translate(${midX}, ${midY - 8})`}>
                    <rect
                      x={-Math.max(28, e.label.length * 5)}
                      y={-11}
                      width={Math.max(56, e.label.length * 10)}
                      height={22}
                      rx={5}
                      fill="#0f1729"
                      stroke={isActive ? color : "#334155"}
                      strokeWidth={1.5}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fill={isActive ? color : "#cbd5e1"}
                      fontSize={12}
                      fontWeight={700}
                      fontFamily="Fira Code, monospace"
                    >
                      {e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {safeNodes.map((n) => {
            const pos = positions.get(n.id);
            if (!pos) return null;
            return <React.Fragment key={n.id}>{renderShape(n, pos.x, pos.y)}</React.Fragment>;
          })}
        </svg>
      </div>
    </div>
  );
};