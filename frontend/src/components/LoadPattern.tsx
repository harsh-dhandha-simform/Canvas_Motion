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

export const LoadPatternSchema = z.object({
  title: z.string().optional(),
  series: z.array(
    z.object({
      label: z.string(),
      color: z.string().optional(),
      points: z.array(z.object({ t: z.number(), value: z.number() })), // t: 0..100, value: 0..100
    })
  ),
  annotations: z
    .array(
      z.object({
        t: z.number(),
        label: z.string(),
        color: z.string().optional(),
      })
    )
    .optional(),
  yLabel: z.string().optional(),
  xLabel: z.string().optional(),
  accentColor: z.string().optional(),
});

export type LoadPatternProps = z.infer<typeof LoadPatternSchema>;

const SERIES_PALETTE = ["#38BDF8", "#a78bfa", "#f59e0b", "#34d399", "#f472b6"];

export const LoadPattern: React.FC<LoadPatternProps> = ({
  title,
  series,
  annotations = [],
  yLabel = "Load",
  xLabel = "Time",
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  // Layout constants inside SVG
  const PAD_L = 120;
  const PAD_R = 120;
  const PAD_T = 100;
  const PAD_B = 120;
  const CHART_W = 1920 - PAD_L - PAD_R;
  const CHART_H = 1080 - PAD_T - PAD_B;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Spring animations for series paths (staggered)
  const seriesSprings = series.map((_, i) =>
    spring({
      frame: frame - (15 + i * 15),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 35,
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
          viewBox="0 0 1920 1080"
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Grid lines and axes */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + CHART_H}
            stroke="#334155"
            strokeWidth={3}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + CHART_H}
            x2={PAD_L + CHART_W}
            y2={PAD_T + CHART_H}
            stroke="#334155"
            strokeWidth={3}
          />

          {/* Grid horizontal markers */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = PAD_T + CHART_H - (val / 100) * CHART_H;
            return (
              <g key={`y-grid-${val}`} opacity={0.35}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + CHART_W}
                  y2={y}
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                />
                <text
                  x={PAD_L - 16}
                  y={y + 6}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize={20}
                  fontWeight={600}
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Axes labels */}
          <text
            x={PAD_L - 80}
            y={PAD_T + CHART_H / 2}
            transform={`rotate(-90, ${PAD_L - 80}, ${PAD_T + CHART_H / 2})`}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={24}
            fontWeight={700}
            letterSpacing="0.05em"
          >
            {yLabel}
          </text>
          <text
            x={PAD_L + CHART_W / 2}
            y={PAD_T + CHART_H + 60}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={24}
            fontWeight={700}
            letterSpacing="0.05em"
          >
            {xLabel}
          </text>

          {/* Series Paths */}
          {series.map((s, sIdx) => {
            const color = s.color || SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
            const sp = seriesSprings[sIdx];

            // Render path points
            const pointsStr = s.points
              .map((p) => {
                const x = PAD_L + (p.t / 100) * CHART_W;
                const y = PAD_T + CHART_H - (p.value / 100) * CHART_H;
                return `${x},${y}`;
              })
              .join(" ");

            const pathLen = CHART_W * 1.5;
            const dashOffset = pathLen * (1 - sp);

            return (
              <g key={`series-${sIdx}`} opacity={sp}>
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={color}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathLen}
                  strokeDashoffset={dashOffset}
                  style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
                />

                {/* Draw small indicator dots along path */}
                {s.points.map((p, pIdx) => {
                  const x = PAD_L + (p.t / 100) * CHART_W;
                  const y = PAD_T + CHART_H - (p.value / 100) * CHART_H;
                  return (
                    <circle
                      key={`pt-${sIdx}-${pIdx}`}
                      cx={x}
                      cy={y}
                      r={7}
                      fill={color}
                      stroke="#0f1729"
                      strokeWidth={2}
                      opacity={sp}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Vertical Annotations (Event Markers) */}
          {annotations.map((ann, aIdx) => {
            const x = PAD_L + (ann.t / 100) * CHART_W;
            const color = ann.color || accentColor;
            const annSpring = spring({
              frame: frame - (40 + aIdx * 12),
              fps,
              config: { damping: 12, stiffness: 100 },
              durationInFrames: 30,
            });

            return (
              <g key={`ann-${aIdx}`} opacity={annSpring}>
                {/* Vertical line */}
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={PAD_T + CHART_H}
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
                />

                {/* Banner box for annotation text */}
                <g transform={`translate(${x}, ${PAD_T - 30})`}>
                  <rect
                    x={-Math.max(60, ann.label.length * 6)}
                    y={-18}
                    width={Math.max(120, ann.label.length * 12)}
                    height={36}
                    rx={6}
                    fill="#1e293b"
                    stroke={color}
                    strokeWidth={2}
                  />
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize={13}
                    fontWeight={800}
                  >
                    {ann.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Chart Legend */}
          <g transform={`translate(${PAD_L + CHART_W - 320}, ${PAD_T + 40})`}>
            {series.map((s, sIdx) => {
              const color = s.color || SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
              return (
                <g key={`leg-${sIdx}`} transform={`translate(0, ${sIdx * 35})`}>
                  <rect x={0} y={-10} width={24} height={12} rx={3} fill={color} />
                  <text
                    x={36}
                    y={2}
                    fill="#cbd5e1"
                    fontSize={18}
                    fontWeight={700}
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
