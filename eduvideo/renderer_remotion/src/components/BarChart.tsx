import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const BarChartSchema = z.object({
  title: z.string().optional(),
  bars: z.array(
    z.object({
      label: z.string(),
      value: z.number(), // 0-100 (percentage of max)
      color: z.string().optional(),
      sublabel: z.string().optional(),
    })
  ),
  accentColor: z.string().optional(),
  showValues: z.boolean().optional(),
  layout: z.enum(["vertical", "horizontal"]).optional(),
});

export type BarChartProps = z.infer<typeof BarChartSchema>;

export const BarChart: React.FC<BarChartProps> = ({
  title,
  bars,
  accentColor = "#38BDF8",
  showValues = true,
  layout = "vertical",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = layout === "vertical";

  // Title fade
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const titleY = interpolate(frame, [0, 20], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Each bar grows in with stagger
  const barSprings = bars.map((_, i) =>
    spring({
      frame: frame - (15 + i * 12),
      fps,
      config: { damping: 16, stiffness: 120 },
      durationInFrames: 35,
    })
  );

  // Value counter — interpolates from 0 to the value
  const barValues = bars.map((bar, i) =>
    interpolate(barSprings[i], [0, 1], [0, bar.value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const maxBar = Math.max(...bars.map((b) => b.value));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        boxSizing: "border-box",
        gap: 48,
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.03em",
            margin: 0,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isVertical ? "row" : "column",
          alignItems: isVertical ? "flex-end" : "flex-start",
          justifyContent: isVertical ? "space-around" : "space-around",
          gap: isVertical ? 20 : 16,
        }}
      >
        {bars.map((bar, i) => {
          const sp = barSprings[i];
          const barColor = bar.color || accentColor;
          const pct = (bar.value / maxBar) * 100;
          const barSize = `${interpolate(sp, [0, 1], [0, pct], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}%`;
          const labelOpacity = interpolate(sp, [0, 0.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          if (isVertical) {
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                  gap: 12,
                }}
              >
                {/* Value */}
                {showValues && (
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: barColor,
                      fontFamily: "Inter, sans-serif",
                      opacity: labelOpacity,
                      textShadow: `0 0 16px ${barColor}`,
                    }}
                  >
                    {Math.round(barValues[i])}%
                  </span>
                )}

                {/* Bar fill */}
                <div
                  style={{
                    width: "100%",
                    height: barSize,
                    maxWidth: 120,
                    background: `linear-gradient(to top, ${barColor}, ${barColor}88)`,
                    borderRadius: "8px 8px 0 0",
                    boxShadow: `0 0 20px ${barColor}60`,
                    position: "relative",
                  }}
                >
                  {/* Shimmer */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "25%",
                      width: "25%",
                      height: "100%",
                      background: "rgba(255,255,255,0.12)",
                      borderRadius: "8px 8px 0 0",
                    }}
                  />
                </div>

                {/* Label */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      fontFamily: "Inter, sans-serif",
                      opacity: labelOpacity,
                      textAlign: "center",
                    }}
                  >
                    {bar.label}
                  </span>
                  {bar.sublabel && (
                    <span style={{ fontSize: 15, color: "#64748b", fontFamily: "Inter, sans-serif", opacity: labelOpacity }}>
                      {bar.sublabel}
                    </span>
                  )}
                </div>
              </div>
            );
          } else {
            // Horizontal
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 20,
                  width: "100%",
                  opacity: sp,
                }}
              >
                {/* Label */}
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "Inter, sans-serif",
                    width: 200,
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {bar.label}
                </span>

                {/* Bar track */}
                <div
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: "#1e293b",
                    borderRadius: 10,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: barSize,
                      background: `linear-gradient(to right, ${barColor}, ${barColor}88)`,
                      borderRadius: 10,
                      boxShadow: `0 0 16px ${barColor}50`,
                    }}
                  />
                </div>

                {/* Value */}
                {showValues && (
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: barColor,
                      fontFamily: "Inter, sans-serif",
                      width: 70,
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(barValues[i])}%
                  </span>
                )}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};
