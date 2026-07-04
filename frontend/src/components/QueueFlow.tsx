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

export const QueueFlowSchema = z.object({
  title: z.string().optional(),
  producers: z.array(z.object({ id: z.string(), label: z.string() })),
  queueLabel: z.string(),
  queueCapacity: z.number().optional(),
  consumers: z.array(z.object({ id: z.string(), label: z.string() })),
  messages: z
    .array(
      z.object({
        id: z.string(),
        color: z.string().optional(),
        label: z.string().optional(),
      })
    )
    .optional(),
  accentColor: z.string().optional(),
  variant: z.enum(["fifo", "priority", "pub-sub"]).optional(),
});

export type QueueFlowProps = z.infer<typeof QueueFlowSchema>;

export const QueueFlow: React.FC<QueueFlowProps> = ({
  title,
  producers,
  queueLabel,
  consumers,
  messages = [],
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  const LW = 1920;
  const LH = 1080;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layout positions
  const leftX = 260;
  const queueX = 960;
  const rightX = 1660;

  // Stagger nodes appearing
  const prodSprings = producers.map((_, i) =>
    spring({
      frame: frame - i * 8,
      fps,
      config: { damping: 12, stiffness: 120 },
      durationInFrames: 30,
    })
  );

  const queueSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 120 },
    durationInFrames: 30,
  });

  const consSprings = consumers.map((_, i) =>
    spring({
      frame: frame - (20 + i * 8),
      fps,
      config: { damping: 12, stiffness: 120 },
      durationInFrames: 30,
    })
  );

  // Animated flowing packets: periodic loops
  const packets = Array.from({ length: 6 }, (_, idx) => {
    const loopDuration = 90;
    const offset = idx * 15;
    const progress = ((frame + offset) % loopDuration) / loopDuration;
    return { id: idx, progress };
  });

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
            marginBottom: 24,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${LW} ${LH}`}
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            <filter id="q-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Producer-Queue Connecting Tracks */}
          {producers.map((_, idx) => {
            const py = LH / 2 + (idx - (producers.length - 1) / 2) * 160;
            return (
              <path
                key={`p-track-${idx}`}
                d={`M ${leftX} ${py} Q ${(leftX + queueX) / 2} ${py}, ${queueX - 220} ${LH / 2}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Queue-Consumer Connecting Tracks */}
          {consumers.map((_, idx) => {
            const cy = LH / 2 + (idx - (consumers.length - 1) / 2) * 160;
            return (
              <path
                key={`c-track-${idx}`}
                d={`M ${queueX + 220} ${LH / 2} Q ${(queueX + rightX) / 2} ${cy}, ${rightX} ${cy}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Flowing data packets */}
          {packets.map((pkt) => {
            let px = 0;
            let py = 0;

            if (pkt.progress < 0.5) {
              // Left column to queue
              const localProg = pkt.progress / 0.5;
              const sourceIdx = pkt.id % producers.length;
              const sourceY = LH / 2 + (sourceIdx - (producers.length - 1) / 2) * 160;

              const x1 = leftX;
              const y1 = sourceY;
              const x2 = queueX - 220;
              const y2 = LH / 2;

              px = x1 + (x2 - x1) * localProg;
              py = y1 + (y2 - y1) * localProg;
            } else {
              // Queue to right column
              const localProg = (pkt.progress - 0.5) / 0.5;
              const destIdx = pkt.id % consumers.length;
              const destY = LH / 2 + (destIdx - (consumers.length - 1) / 2) * 160;

              const x1 = queueX + 220;
              const y1 = LH / 2;
              const x2 = rightX;
              const y2 = destY;

              px = x1 + (x2 - x1) * localProg;
              py = y1 + (y2 - y1) * localProg;
            }

            return (
              <g key={`pkt-${pkt.id}`} filter="url(#q-glow)">
                <circle cx={px} cy={py} r={12} fill={accentColor} />
                <circle cx={px} cy={py} r={5} fill="white" />
              </g>
            );
          })}

          {/* Producers */}
          {producers.map((prod, idx) => {
            const py = LH / 2 + (idx - (producers.length - 1) / 2) * 160;
            const sp = prodSprings[idx];
            return (
              <g
                key={prod.id}
                transform={`translate(${leftX}, ${py}) scale(${sp})`}
                style={{ opacity: sp }}
              >
                <rect
                  x={-120}
                  y={-45}
                  width={240}
                  height={90}
                  rx={12}
                  fill="#0f172a"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                />
                <text
                  x={0}
                  y={8}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize={20}
                  fontWeight={800}
                >
                  {prod.label}
                </text>
              </g>
            );
          })}

          {/* Central Queue Buffer Container */}
          <g
            transform={`translate(${queueX}, ${LH / 2}) scale(${queueSpring})`}
            style={{ opacity: queueSpring }}
          >
            {/* Outer box */}
            <rect
              x={-220}
              y={-100}
              width={440}
              height={200}
              rx={16}
              fill="#0b0f19"
              stroke={accentColor}
              strokeWidth={3}
              style={{ filter: `drop-shadow(0 0 16px ${accentColor}44)` }}
            />
            {/* Inner track boundary */}
            <rect
              x={-200}
              y={-70}
              width={400}
              height={140}
              rx={10}
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth={2}
            />

            {/* Queue Label */}
            <text
              x={0}
              y={-120}
              textAnchor="middle"
              fill={accentColor}
              fontSize={24}
              fontWeight={900}
              letterSpacing="0.1em"
            >
              {queueLabel.toUpperCase()}
            </text>

            {/* Render queue message backlog items if present */}
            {messages.length > 0
              ? messages.slice(0, 5).map((msg, idx) => {
                  const itemColor = msg.color || accentColor;
                  // Space items horizontally inside the queue container
                  const itemX = -150 + idx * 75;
                  return (
                    <g key={msg.id} transform={`translate(${itemX}, 0)`}>
                      <rect
                        x={-28}
                        y={-40}
                        width={56}
                        height={80}
                        rx={8}
                        fill="#1e293b"
                        stroke={itemColor}
                        strokeWidth={2}
                      />
                      <text
                        x={0}
                        y={6}
                        textAnchor="middle"
                        fill={itemColor}
                        fontSize={14}
                        fontWeight={800}
                      >
                        {msg.label || `M${idx + 1}`}
                      </text>
                    </g>
                  );
                })
              : // Default generic backlog representations
                Array.from({ length: 4 }).map((_, idx) => {
                  const itemX = -135 + idx * 90;
                  return (
                    <rect
                      key={`def-item-${idx}`}
                      x={itemX - 25}
                      y={-30}
                      width={50}
                      height={60}
                      rx={6}
                      fill={`${accentColor}18`}
                      stroke={accentColor}
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                    />
                  );
                })}
          </g>

          {/* Consumers */}
          {consumers.map((cons, idx) => {
            const cy = LH / 2 + (idx - (consumers.length - 1) / 2) * 160;
            const sp = consSprings[idx];
            return (
              <g
                key={cons.id}
                transform={`translate(${rightX}, ${cy}) scale(${sp})`}
                style={{ opacity: sp }}
              >
                <rect
                  x={-120}
                  y={-45}
                  width={240}
                  height={90}
                  rx={12}
                  fill="#0f172a"
                  stroke="#34d399"
                  strokeWidth={2.5}
                />
                <text
                  x={0}
                  y={8}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize={20}
                  fontWeight={800}
                >
                  {cons.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
