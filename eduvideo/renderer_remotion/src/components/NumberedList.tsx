import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const NumberedListSchema = z.object({
  title: z.string().optional(),
  items: z.array(
    z.object({
      heading: z.string(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    })
  ),
  accentColor: z.string().optional(),
  /** Layout — "stack" (vertical) or "grid" (2 columns). */
  layout: z.enum(["stack", "grid"]).optional(),
});

export type NumberedListProps = z.infer<typeof NumberedListSchema>;

const ITEM_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

export const NumberedList: React.FC<NumberedListProps> = ({
  title,
  items,
  layout = "stack",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const springs = items.map((_, i) =>
    spring({
      frame: frame - (10 + i * 10),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 35,
    })
  );

  const isGrid = layout === "grid";

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
            marginBottom: 36,
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
          display: "grid",
          gridTemplateColumns: isGrid ? "1fr 1fr" : "1fr",
          gap: isGrid ? 24 : 20,
          alignContent: isGrid ? "center" : "start",
        }}
      >
        {items.map((item, i) => {
          const sp = springs[i];
          const color = item.color || ITEM_PALETTE[i % ITEM_PALETTE.length];
          const scale = interpolate(sp, [0, 1], [0.85, 1]);
          const x = interpolate(sp, [0, 1], [40, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                backgroundColor: "rgba(15, 23, 41, 0.7)",
                border: `1px solid ${color}55`,
                borderLeft: `6px solid ${color}`,
                borderRadius: 16,
                padding: "24px 28px",
                opacity: sp,
                transform: `translateX(${x}px) scale(${scale})`,
                boxShadow: `0 10px 30px -10px rgba(0,0,0,0.5), 0 0 24px -10px ${color}40`,
              }}
            >
              {/* Big numbered badge */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  borderRadius: 14,
                  backgroundColor: `${color}22`,
                  border: `2px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 18px ${color}80`,
                  position: "relative",
                }}
              >
                {item.icon ? (
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                ) : (
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Text content */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.heading}
                </span>
                {item.description && (
                  <span
                    style={{
                      fontSize: 17,
                      color: "#94a3b8",
                      lineHeight: 1.5,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {item.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};