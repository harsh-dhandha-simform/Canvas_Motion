import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const PieChartSchema = z.object({
  title: z.string().optional(),
  /** Each slice. Values are normalized to sum to 100%. */
  slices: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })
  ),
  /** Optional center label (for a donut). */
  centerLabel: z.string().optional(),
  centerValue: z.string().optional(),
  /** Layout variant. */
  variant: z.enum(["pie", "donut"]).optional(),
  accentColor: z.string().optional(),
  showLegend: z.boolean().optional(),
  /** Optional slice index to highlight (gets a "explode" offset). */
  highlightIndex: z.number().int().min(0).optional(),
});

export type PieChartProps = z.infer<typeof PieChartSchema>;

const SLICE_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
  "#22d3ee",
  "#a3e635",
];

export const PieChart: React.FC<PieChartProps> = ({
  title,
  slices,
  centerLabel,
  centerValue,
  variant = "donut",
  accentColor = "#38BDF8",
  showLegend = true,
  highlightIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

  // Layout
  const cx = 800;
  const cy = 540;
  const radius = 280;
  const innerR = variant === "donut" ? radius * 0.55 : 0;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Sweep animation: each slice draws in sequentially
  const sweepTotal = Math.PI * 2;
  let cursor = 0;
  const sliceProgress: { slice: PieChartProps["slices"][0]; start: number; end: number; idx: number }[] =
    slices.map((s, i) => {
      const frac = s.value / total;
      const start = cursor;
      const end = cursor + frac * sweepTotal;
      cursor = end;
      return { slice: s, start, end, idx: i };
    });

  // Animate a global reveal 0 → sweepTotal over time
  const reveal = interpolate(frame, [15, 100], [0, sweepTotal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });

  const isHighlight = (i: number) => i === highlightIndex;
  const explode = (i: number) =>
    isHighlight(i)
      ? 16 * interpolate(Math.sin(frame / 8), [-1, 1], [0.5, 1])
      : 0;

  // Helper: produce path "d" for an annular sector between angles a1, a2
  const annularSector = (a1: number, a2: number) => {
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const x2 = cx + Math.cos(a2) * radius;
    const y2 = cy + Math.sin(a2) * radius;
    const largeArc = a2 - a1 > Math.PI ? 1 : 0;

    if (innerR === 0) {
      return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const ix1 = cx + Math.cos(a1) * innerR;
    const iy1 = cy + Math.sin(a1) * innerR;
    const ix2 = cx + Math.cos(a2) * innerR;
    const iy2 = cy + Math.sin(a2) * innerR;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        padding: "60px 80px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ flex: 1.4, position: "relative" }}>
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
            }}
          >
            {title}
          </h2>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100% - 60px)" }}>
          <svg width={700} height={700} viewBox="0 0 1600 1080">
            <defs>
              <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Each slice — partial sweep based on `reveal` */}
            {sliceProgress.map(({ slice, start, end, idx }) => {
              const color = slice.color || SLICE_PALETTE[idx % SLICE_PALETTE.length];
              const sliceReveal = Math.max(0, Math.min(reveal - start, end - start));
              if (sliceReveal <= 0) return null;
              const a2 = start + sliceReveal;
              const ex = explode(idx);
              // Translate slice slightly outward
              const midA = (start + a2) / 2 - Math.PI / 2;
              const dx = Math.cos(midA) * ex;
              const dy = Math.sin(midA) * ex;

              return (
                <g
                  key={idx}
                  transform={`translate(${dx}, ${dy})`}
                  style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
                >
                  <path
                    d={annularSector(start - Math.PI / 2, a2 - Math.PI / 2)}
                    fill={color}
                    stroke="#0f1729"
                    strokeWidth={2}
                  />
                  {/* Label on the slice if it's wide enough */}
                  {sliceReveal / (end - start) > 0.6 && (end - start) > 0.35 && (
                    <text
                      x={cx + Math.cos(midA) * (radius * 0.7) + dx}
                      y={cy + Math.sin(midA) * (radius * 0.7) + dy + 6}
                      textAnchor="middle"
                      fill="#0f1729"
                      fontSize={20}
                      fontWeight={900}
                      fontFamily="Inter, sans-serif"
                    >
                      {Math.round((slice.value / total) * 100)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Center label for donut */}
            {variant === "donut" && (
              <g>
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={16}
                  fontFamily="Inter, sans-serif"
                  fontWeight={700}
                  letterSpacing="0.15em"
                  textLength={centerLabel ? undefined : 0}
                >
                  {centerLabel || ""}
                </text>
                {centerValue && (
                  <text
                    x={cx}
                    y={cy + 22}
                    textAnchor="middle"
                    fill={accentColor}
                    fontSize={42}
                    fontFamily="Inter, sans-serif"
                    fontWeight={900}
                    style={{ filter: `drop-shadow(0 0 8px ${accentColor})` }}
                  >
                    {centerValue}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
            paddingLeft: 40,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 8,
              opacity: titleOpacity,
            }}
          >
            Breakdown
          </div>
          {slices.map((s, i) => {
            const color = s.color || SLICE_PALETTE[i % SLICE_PALETTE.length];
            const sp = spring({
              frame: frame - (15 + i * 6),
              fps,
              config: { damping: 14, stiffness: 120 },
              durationInFrames: 30,
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: sp,
                  transform: `translateX(${interpolate(sp, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: "#f1f5f9",
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <span
                  style={{
                    color,
                    fontSize: 22,
                    fontWeight: 900,
                    fontFamily: "Fira Code, monospace",
                    minWidth: 80,
                    textAlign: "right",
                  }}
                >
                  {Math.round((s.value / total) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};