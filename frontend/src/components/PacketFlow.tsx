/**
 * PacketFlow — animated network topology with data packets traveling along edges.
 * Nodes positioned by x/y percentages (0-100). Uses full-cover SVG with viewBox
 * so coordinate math matches CSS percentage positioning exactly.
 */
import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

const PacketNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  type: z.enum(["client", "server", "database", "router", "cdn"]).optional(),
  sublabel: z.string().optional(),
});

const PacketEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const PacketFlowSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(PacketNodeSchema),
  edges: z.array(PacketEdgeSchema),
  accentColor: z.string().optional(),
  packetInterval: z.number().optional(),
});

type PacketFlowProps = z.infer<typeof PacketFlowSchema>;

const LW = 1920;
const LH = 1080;
const PACKET_DURATION = 52;
const PACKETS_PER_EDGE = 4;

const TYPE_COLOR: Record<string, string> = {
  client: "#6366f1",
  server: "#10b981",
  database: "#f59e0b",
  router: "#22d3ee",
  cdn: "#8b5cf6",
};

const TYPE_SYMBOL: Record<string, string> = {
  client: "◉",
  server: "▣",
  database: "⬟",
  router: "◈",
  cdn: "◎",
};

export const PacketFlow: React.FC<PacketFlowProps> = ({
  title,
  nodes,
  edges,
  accentColor = "#22d3ee",
  packetInterval = 18,
}) => {
  const frame = useCurrentFrame();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Title fade-in
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {title && (
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 2,
            opacity: titleOpacity,
          }}
        >
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: 52,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
        </div>
      )}

      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
        viewBox={`0 0 ${LW} ${LH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="pf-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pf-node-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Edges ─────────────────────────────────────────────────── */}
        {edges.map((edge, ei) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const x1 = (from.x / 100) * LW;
          const y1 = (from.y / 100) * LH;
          const x2 = (to.x / 100) * LW;
          const y2 = (to.y / 100) * LH;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const edgeColor = edge.color || accentColor;
          const edgeDelay = ei * 10;

          const lineProgress = interpolate(frame, [edgeDelay, edgeDelay + 28], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Animate packets spaced by packetInterval frames
          const packets = Array.from({ length: PACKETS_PER_EDGE }, (_, pi) => {
            const pStart = edgeDelay + 35 + pi * packetInterval;
            const t = interpolate(frame, [pStart, pStart + PACKET_DURATION], [0, 1], {
              easing: Easing.inOut(Easing.quad),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            if (t <= 0 || t >= 1) return null;
            return { t, key: pi, color: edgeColor };
          });

          const labelReveal = interpolate(frame, [edgeDelay + 15, edgeDelay + 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <g key={`edge-${ei}`}>
              {/* Track line */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#1e293b"
                strokeWidth={6}
                strokeLinecap="round"
              />
              {/* Animated reveal */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={edgeColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - lineProgress)}
                opacity={0.55}
              />
              {/* Packets */}
              {packets.map((p) => {
                if (!p) return null;
                const px = x1 + dx * p.t;
                const py = y1 + dy * p.t;
                return (
                  <g key={`pkt-${ei}-${p.key}`} filter="url(#pf-glow)">
                    <circle cx={px} cy={py} r={16} fill={p.color} opacity={0.3} />
                    <circle cx={px} cy={py} r={9} fill={p.color} />
                    <circle cx={px} cy={py} r={4} fill="white" opacity={0.9} />
                  </g>
                );
              })}
              {/* Edge label */}
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 22}
                  fill={edgeColor}
                  fontSize={28}
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={labelReveal}
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Nodes ─────────────────────────────────────────────────── */}
        {nodes.map((node, ni) => {
          const cx = (node.x / 100) * LW;
          const cy = (node.y / 100) * LH;
          const delay = ni * 12;
          const color = TYPE_COLOR[node.type || "server"] || accentColor;
          const symbol = TYPE_SYMBOL[node.type || "server"] || "◉";

          const scale = interpolate(frame, [delay, delay + 20], [0, 1], {
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const labelOpacity = interpolate(frame, [delay + 10, delay + 25], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <g key={`node-${ni}`}>
              <g transform={`translate(${cx},${cy}) scale(${scale})`}>
                {/* Outer pulse ring */}
                <circle r={66} fill="none" stroke={color} strokeWidth={1.5} opacity={0.2} />
                {/* Main node body */}
                <circle
                  r={50}
                  fill="#0f172a"
                  stroke={color}
                  strokeWidth={3}
                  filter="url(#pf-node-shadow)"
                />
                <circle r={46} fill={`${color}14`} />
                {/* Type symbol */}
                <text
                  y={14}
                  textAnchor="middle"
                  fill={color}
                  fontSize={38}
                  fontWeight="900"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {symbol}
                </text>
              </g>
              {/* Label below node (no transform so it doesn't scale oddly) */}
              <text
                x={cx}
                y={cy + 70}
                textAnchor="middle"
                fill="white"
                fontSize={30}
                fontWeight="700"
                opacity={labelOpacity}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {node.label}
              </text>
              {node.sublabel && (
                <text
                  x={cx}
                  y={cy + 102}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={22}
                  fontWeight="500"
                  opacity={labelOpacity}
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
