import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const SequenceDiagramSchema = z.object({
  title: z.string().optional(),
  /** Actors (lifelines) shown at the top, evenly distributed across the canvas. */
  actors: z.array(z.string()).min(2).max(6),
  /** Time-ordered messages. Each goes from one actor to another. */
  messages: z.array(
    z.object({
      fromIdx: z.number().int().min(0),
      toIdx: z.number().int().min(0),
      label: z.string(),
      /** Sync = solid arrow, return = dashed arrow. */
      kind: z.enum(["sync", "return", "async"]).optional(),
      /** If true, the message gets a special highlight color (latest event). */
      active: z.boolean().optional(),
    })
  ),
  /** Optional activation notes — start/end index of message that "activates" each actor. */
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

  // Layout: actors evenly spaced in the top 12% of the canvas
  const STAGE_LEFT = 140;
  const STAGE_RIGHT = 1820;
  const ACTOR_Y = 110;
  const MSG_START_Y = 200;
  const MSG_GAP = 56;
  const bottom = MSG_START_Y + messages.length * MSG_GAP + 40;

  const actorX = (i: number) =>
    STAGE_LEFT + ((STAGE_RIGHT - STAGE_LEFT) * i) / (actors.length - 1);

  // Title fade
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Actors appear first
  const actorSprings = actors.map((_actor, i) =>  // eslint-disable-line @typescript-eslint/no-unused-vars
    spring({
      frame,
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 30,
    })
  );

  // Messages appear staggered
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
          style={{ position: "absolute", inset: 0 }}
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

          {/* Lifelines (vertical dashed lines under each actor) */}
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
            const scale = interpolate(sp, [0, 1], [0.7, 1]);
            return (
              <g
                key={`actor-${i}`}
                transform={`translate(${x}, ${ACTOR_Y}) scale(${scale})`}
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

          {/* Activation bars (filled rectangles on a lifeline) */}
          {activations.map((act, i) => {
            const x = actorX(act.actorIdx);
            const y1 = MSG_START_Y + act.startMessage * MSG_GAP - 12;
            const y2 = MSG_START_Y + act.endMessage * MSG_GAP + 12;
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

          {/* Messages (arrows between lifelines) */}
          {messages.map((msg, i) => {
            const y = MSG_START_Y + i * MSG_GAP;
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

            // For left-going arrows, the arrowhead still points at "to"
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
                  style={{
                    filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined,
                  }}
                />

                {/* Label box centered between from and to */}
                <g
                  transform={`translate(${(x1 + x2) / 2}, ${y - 18})`}
                  style={{
                    opacity: sp,
                  }}
                >
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
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};