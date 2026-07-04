import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const RetrySequenceSchema = z.object({
  title: z.string().optional(),
  attempts: z.array(
    z.object({
      attemptNumber: z.number(),
      delayMs: z.number(), // Width of delay gap (proportional)
      outcome: z.enum(["fail", "success", "timeout"]),
      label: z.string().optional(),
    })
  ),
  maxAttempts: z.number().optional(),
  accentColor: z.string().optional(),
});

export type RetrySequenceProps = z.infer<typeof RetrySequenceSchema>;

const OUTCOME_COLORS = {
  fail: "#ef4444",
  timeout: "#f59e0b",
  success: "#34d399",
};

const OUTCOME_SYMBOLS = {
  fail: "✗",
  timeout: "⏱",
  success: "✓",
};

export const RetrySequence: React.FC<RetrySequenceProps> = ({
  title,
  attempts,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dynamic layout margins and spacing
  const totalDelay = attempts.reduce((s, x) => s + x.delayMs, 0) || 1;
  const startX = 150;
  const totalWidth = 1620;

  // Stagger entry of attempts
  const attemptSprings = attempts.map((_, idx) =>
    spring({
      frame: frame - (15 + idx * 18),
      fps,
      config: { damping: 14, stiffness: 120 },
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
            marginBottom: 32,
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
          viewBox="0 0 1920 1080"
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            <filter id="retry-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Timeline connecting track */}
          <line
            x1={startX}
            y1={540}
            x2={startX + totalWidth}
            y2={540}
            stroke="#1e293b"
            strokeWidth={6}
            strokeLinecap="round"
          />

          {/* Render individual attempts and delay intervals */}
          {(() => {
            let currentX = startX;
            return attempts.map((attempt, idx) => {
              const sp = attemptSprings[idx];
              const outcomeColor = OUTCOME_COLORS[attempt.outcome];
              const symbol = OUTCOME_SYMBOLS[attempt.outcome];

              const x = currentX;
              // Width of next gap is proportional to delayMs
              const gapWidth = (attempt.delayMs / totalDelay) * (totalWidth - 200);
              currentX += gapWidth + 60; // Offset next item location

              return (
                <g key={idx} opacity={sp}>
                  {/* Outer glowing ring */}
                  <circle
                    cx={x}
                    cy={540}
                    r={56}
                    fill="none"
                    stroke={outcomeColor}
                    strokeWidth={1.5}
                    opacity={0.2}
                  />

                  {/* Main dot circle */}
                  <circle
                    cx={x}
                    cy={540}
                    r={42}
                    fill="#0f172a"
                    stroke={outcomeColor}
                    strokeWidth={3}
                    style={{ filter: `drop-shadow(0 0 10px ${outcomeColor}55)` }}
                  />

                  {/* Outcome symbol */}
                  <text
                    x={x}
                    y={551}
                    textAnchor="middle"
                    fill={outcomeColor}
                    fontSize={36}
                    fontWeight={900}
                  >
                    {symbol}
                  </text>

                  {/* Attempt title/label */}
                  <text
                    x={x}
                    y={460}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize={22}
                    fontWeight={800}
                  >
                    {attempt.label || `Attempt ${attempt.attemptNumber}`}
                  </text>

                  {/* Connecting line progress segment */}
                  {idx < attempts.length - 1 && (
                    <line
                      x1={x + 42}
                      y1={540}
                      x2={x + 42 + gapWidth * sp}
                      y2={540}
                      stroke={sp > 0.8 ? outcomeColor : "#334155"}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Delay tag label shown below connection line */}
                  {idx < attempts.length - 1 && attempt.delayMs > 0 && (
                    <g transform={`translate(${x + 42 + gapWidth / 2}, 600)`} opacity={sp}>
                      <rect
                        x={-60}
                        y={-18}
                        width={120}
                        height={32}
                        rx={6}
                        fill="#0b0f19"
                        stroke="#334155"
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize={14}
                        fontWeight={700}
                        fontFamily="monospace"
                      >
                        backoff {attempt.delayMs}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
};
