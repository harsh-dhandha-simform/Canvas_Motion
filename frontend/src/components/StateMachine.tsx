import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const StateMachineSchema = z.object({
  title: z.string().optional(),
  states: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      color: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  transitions: z.array(
    z.object({
      fromId: z.string(),
      toId: z.string(),
      label: z.string(),
      highlight: z.boolean().optional(),
      guard: z.string().optional(),
      action: z.string().optional(),
    })
  ),
  activeStateId: z.string().optional(),
  accentColor: z.string().optional(),
});

export type StateMachineProps = z.infer<typeof StateMachineSchema>;

const STATE_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

function layoutStates(count: number) {
  const cx = 960;
  const cy = 540;
  const r = 260;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });
}

export const StateMachine: React.FC<StateMachineProps> = ({
  title,
  states,
  transitions,
  activeStateId,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  const positions = layoutStates(states.length);
  const stateById = new Map(states.map((s, i) => [s.id, { ...s, ...positions[i] }]));

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const stateSprings = states.map((_, i) =>
    spring({
      frame: frame - (15 + i * 8),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  const transitionStart = 15 + states.length * 8 + 10;
  const transitionSprings = transitions.map((_, i) =>
    spring({
      frame: frame - (transitionStart + i * 8),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 35,
    })
  );

  const pulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.4, 1]);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Title section remains fixed and stable */}
      {title && (
        <h2
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 12,
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
          fontSize: 18,
          margin: 0,
          marginBottom: 24,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        Finite-state machine — events trigger transitions between states.
      </p>

      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1920 1080"
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            <marker
              id="sm-arrow"
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
              id="sm-arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={accentColor} />
            </marker>
            <filter id="sm-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transitions */}
          {transitions.map((t, i) => {
            const from = stateById.get(t.fromId);
            const to = stateById.get(t.toId);
            if (!from || !to) return null;
            const sp = transitionSprings[i];
            const isSelf = t.fromId === t.toId;
            const isActive = !!t.highlight;

            const BOX = 130;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / dist;
            const uy = dy / dist;

            const x1 = from.x + ux * BOX;
            const y1 = from.y + uy * BOX;
            const x2 = to.x - ux * BOX;
            const y2 = to.y - uy * BOX;

            const color = isActive ? accentColor : "#94a3b8";
            const opacity = sp * (isActive ? 1 : 0.6);

            if (isSelf) {
              const loopR = 70;
              return (
                <g key={`t-${i}`} opacity={opacity}>
                  <path
                    d={`M ${from.x} ${from.y - BOX} A ${loopR} ${loopR} 0 1 1 ${from.x - 4} ${from.y - BOX}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    markerEnd="url(#sm-arrow)"
                    style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}
                  />
                  <text
                    x={from.x}
                    y={from.y - BOX - loopR - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize={14}
                    fontWeight={700}
                    fontFamily="Fira Code, monospace"
                  >
                    {t.label}
                  </text>
                </g>
              );
            }

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const perpX = -uy * 30;
            const perpY = ux * 30;
            const cx = midX + perpX;
            const cy = midY + perpY;

            const pathLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) + 60;
            const dashOffset = pathLen * (1 - sp);

            const labelX = midX + perpX * 0.6;
            const labelY = midY + perpY * 0.6;

            // Compute labels text & dynamic box size
            const lines = [t.label];
            if (t.guard) lines.push(`[${t.guard}]`);
            if (t.action) lines.push(`/ ${t.action}`);

            const maxLen = Math.max(...lines.map(l => l.length));
            const boxW = Math.max(72, maxLen * 11);
            const boxH = lines.length * 20 + 8;

            return (
              <g key={`t-${i}`} opacity={opacity}>
                <path
                  d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 4 : 3}
                  strokeLinecap="round"
                  strokeDasharray={pathLen}
                  strokeDashoffset={dashOffset}
                  markerEnd={isActive ? "url(#sm-arrow-active)" : "url(#sm-arrow)"}
                  style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}
                />
                <g transform={`translate(${labelX}, ${labelY})`}>
                  <rect
                    x={-boxW / 2}
                    y={-boxH / 2}
                    width={boxW}
                    height={boxH}
                    rx={6}
                    fill="#0f1729"
                    stroke={isActive ? color : "#334155"}
                    strokeWidth={1.5}
                  />
                  {lines.map((line, lineIdx) => {
                    const isFirst = lineIdx === 0;
                    const isGuard = line.startsWith("[");
                    const isAction = line.startsWith("/");
                    let fill = "#cbd5e1";
                    let fontSize = 13;
                    let fontWeight = "700";

                    if (isFirst) {
                      fill = isActive ? color : "#cbd5e1";
                    } else if (isGuard) {
                      fill = "#64748b";
                      fontSize = 11;
                      fontWeight = "500";
                    } else if (isAction) {
                      fill = accentColor;
                      fontSize = 11;
                      fontWeight = "600";
                    }

                    return (
                      <text
                        key={lineIdx}
                        x={0}
                        y={-boxH / 2 + 16 + lineIdx * 19}
                        textAnchor="middle"
                        fill={fill}
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        fontFamily="Fira Code, monospace"
                      >
                        {line}
                      </text>
                    );
                  })}
                </g>
              </g>
            );
          })}

          {/* States */}
          {states.map((s, i) => {
            const pos = positions[i];
            const sp = stateSprings[i];
            const isActive = s.id === activeStateId;
            const baseColor = s.color || STATE_PALETTE[i % STATE_PALETTE.length];
            const scaleVal = interpolate(sp, [0, 1], [0.6, 1]);
            const opacity = sp;

            return (
              <g
                key={s.id}
                transform={`translate(${pos.x}, ${pos.y}) scale(${scaleVal})`}
                style={{ opacity, transformOrigin: `${pos.x}px ${pos.y}px` }}
              >
                <rect
                  x={-90}
                  y={-50}
                  width={180}
                  height={100}
                  rx={16}
                  fill="#0f1729"
                  stroke={isActive ? accentColor : baseColor}
                  strokeWidth={isActive ? 4 : 2.5}
                  style={{
                    filter: isActive
                      ? `drop-shadow(0 0 ${12 * pulse}px ${accentColor})`
                      : `drop-shadow(0 0 6px ${baseColor}60)`,
                  }}
                />
                <text
                  x={0}
                  y={s.description ? -8 : 8}
                  textAnchor="middle"
                  fill={isActive ? accentColor : "#f1f5f9"}
                  fontSize={20}
                  fontWeight={900}
                  fontFamily="Inter, sans-serif"
                >
                  {s.label}
                </text>
                {s.description && (
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={12}
                    fontFamily="Fira Code, monospace"
                  >
                    {s.description}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};