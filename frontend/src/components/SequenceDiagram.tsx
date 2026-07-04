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

export const SequenceDiagramSchema = z.object({
  title: z.string().optional(),
  actors: z.array(z.string()).min(2).max(6),
  messages: z.array(
    z.object({
      fromIdx: z.number().int().min(0),
      toIdx: z.number().int().min(0),
      label: z.string(),
      kind: z.enum(["sync", "return", "async"]).optional(),
      active: z.boolean().optional(),
      delayMs: z.number().optional(),
    })
  ),
  activations: z
    .array(
      z.object({
        actorIdx: z.number().int().min(0),
        startMessage: z.number().int().min(0),
        endMessage: z.number().int().min(0),
        label: z.string().optional(),
      })
    )
    .optional(),
  accentColor: z.string().optional(),
});

export type SequenceDiagramProps = z.infer<typeof SequenceDiagramSchema>;

const ACTOR_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({
  title,
  actors,
  messages,
  activations = [],
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  const STAGE_LEFT = 140;
  const STAGE_RIGHT = 1820;
  const ACTOR_Y = 110;
  const MSG_START_Y = 200;
  const MSG_GAP = 56;

  // Calculate dynamic message Y coordinates based on delayMs
  const messageYs: number[] = [];
  let currentY = MSG_START_Y;
  const maxDelay = Math.max(...messages.map((m) => m.delayMs || 0), 1);

  messages.forEach((msg) => {
    messageYs.push(currentY);
    const delay = msg.delayMs || 0;
    const factor = delay > 0 ? 1 + (delay / maxDelay) * 1.5 : 1; // max 2.5x gap
    currentY += MSG_GAP * factor;
  });

  const bottom = currentY + 40;

  const actorX = (i: number) =>
    STAGE_LEFT + ((STAGE_RIGHT - STAGE_LEFT) * i) / (actors.length - 1);

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const actorSprings = actors.map((_actor, i) =>
    spring({
      frame,
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  const messageSprings = messages.map((_, i) =>
    spring({
      frame: frame - (15 + i * 12),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  return (
    <div
      ref={ref}
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
      {/* Title section remains fixed and stable */}
      {title && (
        <h2
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 8,
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 1920 ${bottom}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center top",
          }}
        >
          <defs>
            <marker
              id="seq-arrow-sync"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
            </marker>
            <marker
              id="seq-arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={accentColor} />
            </marker>
            <marker
              id="seq-arrow-async"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
            </marker>
          </defs>

          {/* Lifelines */}
          {actors.map((name, i) => {
            const x = actorX(i);
            const sp = actorSprings[i];
            return (
              <line
                key={`life-${i}`}
                x1={x}
                y1={ACTOR_Y + 30}
                x2={x}
                y2={bottom - 20}
                stroke="#475569"
                strokeWidth={2}
                strokeDasharray="6 8"
                opacity={sp * 0.6}
              />
            );
          })}

          {/* Actor boxes */}
          {actors.map((name, i) => {
            const x = actorX(i);
            const sp = actorSprings[i];
            const color = ACTOR_PALETTE[i % ACTOR_PALETTE.length];
            const scaleVal = interpolate(sp, [0, 1], [0.7, 1]);
            return (
              <g
                key={`actor-${i}`}
                transform={`translate(${x}, ${ACTOR_Y}) scale(${scaleVal})`}
                style={{ opacity: sp, transformOrigin: `${x}px ${ACTOR_Y}px` }}
              >
                <rect
                  x={-90}
                  y={-26}
                  width={180}
                  height={52}
                  rx={12}
                  fill="#0f1729"
                  stroke={color}
                  strokeWidth={2.5}
                  style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
                />
                <text
                  x={0}
                  y={6}
                  textAnchor="middle"
                  fill={color}
                  fontSize={16}
                  fontWeight={800}
                  fontFamily="Inter, sans-serif"
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* Activation bars */}
          {activations.map((act, i) => {
            const x = actorX(act.actorIdx);
            const y1 = messageYs[act.startMessage] - 12;
            const y2 = messageYs[act.endMessage] + 12;
            const sp = Math.min(
              messageSprings[act.startMessage] ?? 0,
              messageSprings[act.endMessage] ?? 0
            );
            return (
              <g key={`act-${i}`} opacity={sp * 0.95}>
                <rect
                  x={x - 7}
                  y={y1}
                  width={14}
                  height={y2 - y1}
                  fill={accentColor}
                  opacity={0.85}
                  rx={3}
                  style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}
                />
                {act.label && (
                  <text
                    x={x + 14}
                    y={y1 + 14}
                    fill="#cbd5e1"
                    fontSize={11}
                    fontFamily="Fira Code, monospace"
                  >
                    {act.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Messages and optional delay annotations */}
          {messages.map((msg, i) => {
            const y = messageYs[i];
            const nextY = messageYs[i + 1] ?? y;
            const fromX = actorX(msg.fromIdx);
            const toX = actorX(msg.toIdx);
            const sp = messageSprings[i];
            const isActive = !!msg.active;
            const kind = msg.kind || "sync";

            const isReturn = kind === "return";
            const isAsync = kind === "async";

            const color = isActive
              ? accentColor
              : isAsync
              ? "#a78bfa"
              : isReturn
              ? "#94a3b8"
              : "#cbd5e1";
            const stroke = isReturn ? "6 6" : undefined;
            const marker = isActive
              ? "url(#seq-arrow-active)"
              : isAsync
              ? "url(#seq-arrow-async)"
              : "url(#seq-arrow-sync)";

            const x1 = fromX;
            const x2 = toX;

            return (
              <g key={`msg-${i}`} opacity={sp}>
                {/* Animated line */}
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={color}
                  strokeWidth={isActive ? 4 : 3}
                  strokeDasharray={stroke}
                  markerEnd={marker}
                  opacity={isReturn ? 0.75 : 1}
                  style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}
                />

                {/* Label box centered between from and to */}
                <g transform={`translate(${(x1 + x2) / 2}, ${y - 18})`}>
                  <rect
                    x={-Math.max(40, msg.label.length * 5.5)}
                    y={-12}
                    width={Math.max(80, msg.label.length * 11)}
                    height={22}
                    rx={6}
                    fill="#0f1729"
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill={color}
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="Fira Code, monospace"
                  >
                    {msg.label}
                  </text>
                </g>

                {/* Delay annotation if present */}
                {msg.delayMs !== undefined && msg.delayMs > 0 && nextY > y && (
                  <g transform={`translate(${(fromX + toX) / 2}, ${(y + nextY) / 2})`}>
                    <rect
                      x={-45}
                      y={-10}
                      width={90}
                      height={20}
                      rx={4}
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth={1}
                      opacity={0.8}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      fontFamily="Fira Code, monospace"
                    >
                      ⏱ {msg.delayMs}ms
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};