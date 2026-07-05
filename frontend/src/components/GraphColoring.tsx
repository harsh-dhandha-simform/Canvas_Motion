import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateColoringSteps, ColorNode, ColorEdge } from "./GraphColoring.steps";

export const GraphColoringSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(z.object({ id: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type GraphColoringProps = z.infer<typeof GraphColoringSchema>;

const NODE_R = 34;
const PALETTE = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6"];

export const GraphColoring: React.FC<GraphColoringProps> = ({
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
    () => generateColoringSteps(nodes as ColorNode[], edges as ColorEdge[]),
    [nodes, edges],
  );

  const stepFrames = Math.max(1, Math.round((0.85 / speed) * fps));
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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>{step.numColors} colors</span>
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {step.edges.map((e, i) => {
          const a = posById.get(e.from);
          const b = posById.get(e.to);
          if (!a || !b) return null;
          const isCheck =
            step.checkingNeighbor !== null &&
            step.current !== null &&
            ((e.from === step.current && e.to === step.checkingNeighbor) ||
              (e.to === step.current && e.from === step.checkingNeighbor));
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isCheck ? accent : "#475569"}
              strokeWidth={isCheck ? 5 : 2.5}
            />
          );
        })}

        {step.nodes.map((n) => {
          const p = posById.get(n.id) as { x: number; y: number };
          const col = step.colorOf[n.id];
          const hasColor = col !== undefined;
          const isCurrent = step.current === n.id;
          const isNeighbor = step.checkingNeighbor === n.id;
          const paletteColor = hasColor ? PALETTE[col % PALETTE.length] : null;
          const fill = paletteColor ? mix("#0b1220", paletteColor, 0.85) : "#1e293b";
          const border = isCurrent ? accent : isNeighbor ? accent : paletteColor ?? "#475569";
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={isCurrent || isNeighbor ? 5 : 3}
                style={{ filter: isCurrent ? `drop-shadow(0 0 14px ${accent}${Math.round(glow * 90).toString(16).padStart(2, "0")})` : undefined }}
              />
              <text textAnchor="middle" dy={8} fill="#f8fafc" fontSize={24} fontWeight={800}>{n.id}</text>
            </g>
          );
        })}
      </svg>

      {/* color legend */}
      <div style={{ position: "absolute", top: 66, right: 150, display: "flex", gap: 16 }}>
        {Array.from({ length: Math.max(1, step.numColors) }).map((_, c) => (
          <span key={c} style={{ display: "flex", alignItems: "center", gap: 6, color: "#f1f5f9", fontSize: 16 }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: PALETTE[c % PALETTE.length] }} /> {c}
          </span>
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
          color: step.kind === "assign" ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
