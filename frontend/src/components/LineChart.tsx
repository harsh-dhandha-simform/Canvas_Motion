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

export const LineChartSchema = z.object({
  title: z.string().optional(),
  xLabels: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      color: z.string().optional(),
      values: z.array(z.number()),
      fill: z.boolean().optional(),
    })
  ),
  yLabel: z.string().optional(),
  xLabel: z.string().optional(),
  accentColor: z.string().optional(),
  showLegend: z.boolean().optional(),
  highlightIndex: z.number().int().min(0).optional(),
});

export type LineChartProps = z.infer<typeof LineChartSchema>;

const SERIES_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

export const LineChart: React.FC<LineChartProps> = ({
  title,
  xLabels,
  series,
  yLabel,
  xLabel,
  accentColor = "#38BDF8",
  showLegend = true,
  highlightIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  // Plot area
  const PAD_L = 140;
  const PAD_R = 80;
  const PAD_T = 130;
  const PAD_B = 110;
  const PLOT_W = 1920 - PAD_L - PAD_R;
  const PLOT_H = 1080 - PAD_T - PAD_B;

  const allValues = series.flatMap((s) => s.values);
  const yMin = Math.min(0, ...allValues);
  const yMax = Math.max(...allValues) * 1.1 || 1;
  const yRange = yMax - yMin || 1;

  const xAt = (i: number) =>
    PAD_L + (PLOT_W * i) / Math.max(1, xLabels.length - 1);
  const yAt = (v: number) =>
    PAD_T + PLOT_H - ((v - yMin) / yRange) * PLOT_H;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const axisSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
    durationInFrames: 30,
  });

  const seriesDrawProgress = series.map((_, i) =>
    interpolate(frame, [20 + i * 10, 70 + i * 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    })
  );

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const v = yMin + (yRange * i) / yTickCount;
    return { v, y: yAt(v) };
  });

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "50px 60px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Title section remains fixed and stable */}
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
      <div
        style={{
          flex: 1,
          position: "relative",
          opacity: axisSpring,
        }}
      >
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
          {/* Y-axis grid lines + labels */}
          {yTicks.map((tick, i) => (
            <g key={`yt-${i}`}>
              <line
                x1={PAD_L}
                y1={tick.y}
                x2={1920 - PAD_R}
                y2={tick.y}
                stroke="#334155"
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.6}
              />
              <text
                x={PAD_L - 14}
                y={tick.y + 5}
                textAnchor="end"
                fill="#64748b"
                fontSize={14}
                fontFamily="Fira Code, monospace"
              >
                {Math.round(tick.v).toLocaleString()}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={`xl-${i}`}
              x={xAt(i)}
              y={PAD_T + PLOT_H + 32}
              textAnchor="middle"
              fill="#64748b"
              fontSize={14}
              fontFamily="Fira Code, monospace"
            >
              {label}
            </text>
          ))}

          {/* Y-axis label */}
          {yLabel && (
            <text
              x={-540}
              y={50}
              transform="rotate(-90)"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={16}
              fontFamily="Inter, sans-serif"
              fontWeight={700}
            >
              {yLabel}
            </text>
          )}
          {xLabel && (
            <text
              x={1920 / 2}
              y={PAD_T + PLOT_H + 75}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={16}
              fontFamily="Inter, sans-serif"
              fontWeight={700}
            >
              {xLabel}
            </text>
          )}

          {/* X and Y axis lines */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + PLOT_H}
            stroke="#94a3b8"
            strokeWidth={2}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + PLOT_H}
            x2={1920 - PAD_R}
            y2={PAD_T + PLOT_H}
            stroke="#94a3b8"
            strokeWidth={2}
          />

          {/* Each series */}
          {series.map((s, sIdx) => {
            const color = s.color || SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
            const progress = seriesDrawProgress[sIdx];

            const visiblePoints = s.values.length;
            const visibleCount = Math.max(
              2,
              Math.floor(visiblePoints * progress)
            );
            const pathPoints = s.values.slice(0, visibleCount).map((v, i) => ({
              x: xAt(i),
              y: yAt(v),
            }));

            if (pathPoints.length < 2) return null;

            const linePath = pathPoints
              .map((p, i) =>
                i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
              )
              .join(" ");

            const fillPath =
              s.fill && pathPoints.length >= 2
                ? `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${
                    PAD_T + PLOT_H
                  } L ${pathPoints[0].x} ${PAD_T + PLOT_H} Z`
                : null;

            return (
              <g key={`s-${sIdx}`}>
                {fillPath && (
                  <path
                    d={fillPath}
                    fill={color}
                    opacity={0.18}
                  />
                )}
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
                />
                {pathPoints.map((p, i) => (
                  <circle
                    key={`p-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={i === highlightIndex ? 9 : 5}
                    fill={i === highlightIndex ? accentColor : color}
                    stroke="#0f1729"
                    strokeWidth={i === highlightIndex ? 3 : 2}
                    style={
                      i === highlightIndex
                        ? { filter: `drop-shadow(0 0 10px ${accentColor})` }
                        : undefined
                    }
                  />
                ))}
              </g>
            );
          })}

          {/* Highlight point callout */}
          {highlightIndex !== undefined && highlightIndex < xLabels.length && (
            <g>
              <line
                x1={xAt(highlightIndex)}
                y1={PAD_T}
                x2={xAt(highlightIndex)}
                y2={PAD_T + PLOT_H}
                stroke={accentColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
              />
              <text
                x={xAt(highlightIndex)}
                y={PAD_T - 12}
                textAnchor="middle"
                fill={accentColor}
                fontSize={14}
                fontWeight={700}
                fontFamily="Fira Code, monospace"
              >
                {xLabels[highlightIndex]}
              </text>
            </g>
          )}
        </svg>

        {/* Legend remains fixed at the top right */}
        {showLegend && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 80,
              display: "flex",
              flexDirection: "row",
              gap: 20,
              opacity: titleOpacity,
            }}
          >
            {series.map((s, i) => {
              const color = s.color || SERIES_PALETTE[i % SERIES_PALETTE.length];
              return (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                  <span
                    style={{
                      color: "#cbd5e1",
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {s.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};