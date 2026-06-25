import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const TwoColumnLayoutSchema = z.object({
  title: z.string().optional(),
  left: z.object({
    heading: z.string(),
    points: z.array(z.string()),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
  right: z.object({
    heading: z.string(),
    points: z.array(z.string()),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
  accentColor: z.string().optional(),
  dividerLabel: z.string().optional(),
});

export type TwoColumnLayoutProps = z.infer<typeof TwoColumnLayoutSchema>;

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  title,
  left,
  right,
  accentColor = "#38BDF8",
  dividerLabel = "VS",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
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

  // Left column slides from left
  const leftSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 100 },
    durationInFrames: 35,
  });
  const leftX = interpolate(leftSpring, [0, 1], [-80, 0]);

  // Right column slides from right (slight delay)
  const rightSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14, stiffness: 100 },
    durationInFrames: 35,
  });
  const rightX = interpolate(rightSpring, [0, 1], [80, 0]);

  // Divider grows vertically
  const dividerProgress = interpolate(frame, [20, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Bullet stagger for each column — 10 frames apart
  const bulletSprings = (column: "left" | "right", count: number) =>
    Array.from({ length: count }, (_, i) =>
      spring({
        frame: frame - (column === "left" ? 35 : 45) - i * 10,
        fps,
        config: { damping: 12, stiffness: 140 },
        durationInFrames: 20,
      })
    );

  const leftBullets = bulletSprings("left", left.points.length);
  const rightBullets = bulletSprings("right", right.points.length);

  const renderColumn = (
    col: typeof left,
    bullets: number[],
    x: number,
    opacity: number,
    side: "left" | "right"
  ) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "20px 28px",
          backgroundColor: col.color ? `${col.color}18` : "#1e293b",
          border: `1px solid ${col.color || accentColor}30`,
          borderRadius: 14,
        }}
      >
        {col.icon && (
          <span style={{ fontSize: 40 }}>{col.icon}</span>
        )}
        <span
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: col.color || accentColor,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {col.heading}
        </span>
      </div>

      {/* Points */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {col.points.map((point, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              opacity: bullets[i],
              transform: `translateX(${interpolate(bullets[i], [0, 1], [side === "left" ? -20 : 20, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: col.color || accentColor,
                marginTop: 8,
                flexShrink: 0,
                boxShadow: `0 0 10px ${col.color || accentColor}`,
              }}
            />
            <span
              style={{
                fontSize: 22,
                color: "#cbd5e1",
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {point}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "50px 80px",
        boxSizing: "border-box",
        gap: 40,
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
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 0,
        }}
      >
        {/* Left column */}
        {renderColumn(left, leftBullets, leftX, leftSpring, "left")}

        {/* Divider */}
        <div
          style={{
            width: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 20,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 3,
              height: `${dividerProgress * 320}px`,
              background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
              borderRadius: 3,
              marginBottom: 12,
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: accentColor,
              fontFamily: "Inter, sans-serif",
              opacity: dividerProgress,
              textShadow: `0 0 20px ${accentColor}`,
            }}
          >
            {dividerLabel}
          </span>
          <div
            style={{
              width: 3,
              height: `${dividerProgress * 320}px`,
              background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
              borderRadius: 3,
              marginTop: 12,
            }}
          />
        </div>

        {/* Right column */}
        {renderColumn(right, rightBullets, rightX, rightSpring, "right")}
      </div>
    </div>
  );
};
