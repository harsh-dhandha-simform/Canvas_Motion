import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const StateMachineSchema = z.object({
  title: z.string().optional(),
  /** State nodes. */
  states: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      color: z.string().optional(),
      /** Optional description that appears under the label. */
      description: z.string().optional(),
    })
  ),
  /** Directed transitions between states. */
  transitions: z.array(
    z.object({
      fromId: z.string(),
      toId: z.string(),
      label: z.string(),
      /** Optional: highlight this transition (color pulses, others fade). */
      highlight: z.boolean().optional(),
    })
  ),
  /** Optional id of the state to start "active" — pulses in primary color. */
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

/**
 * Auto-layout: arrange states evenly in a circle, large enough to fit
 * 8pt label boxes without overlap. Good for up to ~8 states.
 */
function layoutStates(count: number) {
  const cx = 960;
  const cy = 540;
  const r = 260;
  // Start at top, go clockwise
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

  const safeStates = states ?? [];
  const safeTransitions = transitions ?? [];

  const positions = layoutStates(safeStates.length);
  const stateById = new Map(safeStates.map((s, i) => [s.id, { ...s, ...positions[i] }]));

  // Title fade
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // States spring in stagger
  const stateSprings = safeStates.map((_, i) =>
    spring({
      frame: frame - (15 + i * 8),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  // Transitions draw in after states
  const transitionStart = 15 + safeStates.length * 8 + 10;
  const transitionSprings = safeTransitions.map((_, i) =>
    spring({
      frame: frame - (transitionStart + i * 8),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 35,
    })
  );

  // Active state pulsing glow
  const pulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.4, 1]);

  return (
    <div
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
          style={{ position: "absolute", inset: 0 }}
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

          {/* Transitions (drawn under states) */}
          {safeTransitions.map((t, i) => {
            const from = stateById.get(t.fromId);
            const to = stateById.get(t.toId);
            if (!from || !to) return null;
            const sp = transitionSprings[i];
            const isSelf = t.fromId === t.toId;
            const isActive = !!t.highlight;

            // Pull endpoints back to the box edge so arrowheads don't sit inside boxes
            const BOX = 130; // half-width of a state box
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

            // Self-loop path
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

            // Curved path between states (control point offset perpendicular)
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const perpX = -uy * 30;
            const perpY = ux * 30;
            const cx = midX + perpX;
            const cy = midY + perpY;

            // Animated draw-in
            const pathLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) + 60;
            const dashOffset = pathLen * (1 - sp);

            // Label position at midpoint of curve
            const labelX = midX + perpX * 0.6;
            const labelY = midY + perpY * 0.6;

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
                    x={-Math.max(36, t.label.length * 5.5)}
                    y={-12}
                    width={Math.max(72, t.label.length * 11)}
                    height={24}
                    rx={6}
                    fill="#0f1729"
                    stroke={isActive ? color : "#334155"}
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill={isActive ? color : "#cbd5e1"}
                    fontSize={13}
                    fontWeight={700}
                    fontFamily="Fira Code, monospace"
                  >
                    {t.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* States */}
          {safeStates.map((s, i) => {
            const pos = positions[i];
            const sp = stateSprings[i];
            const isActive = s.id === activeStateId;
            const baseColor = s.color || STATE_PALETTE[i % STATE_PALETTE.length];
            const scale = interpolate(sp, [0, 1], [0.6, 1]);
            const opacity = sp;

            return (
              <g
                key={s.id}
                transform={`translate(${pos.x}, ${pos.y}) scale(${scale})`}
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