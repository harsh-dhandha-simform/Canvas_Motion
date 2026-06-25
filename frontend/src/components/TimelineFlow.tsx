import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const TimelineFlowSchema = z.object({
  title: z.string().optional(),
  events: z.array(
    z.object({
      year: z.string(),
      label: z.string(),
      description: z.string().optional(),
      highlight: z.boolean().optional(),
    })
  ),
  accentColor: z.string().optional(),
  direction: z.enum(["vertical", "horizontal"]).optional(),
});

export type TimelineFlowProps = z.infer<typeof TimelineFlowSchema>;

export const TimelineFlow: React.FC<TimelineFlowProps> = ({
  title,
  events,
  accentColor = "#38BDF8",
  direction = "vertical",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = direction === "vertical";

  // Title drops in
  const titleY = interpolate(frame, [0, 20], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Stagger each event by 18 frames
  const eventSprings = events.map((_, i) =>
    spring({
      frame: frame - (20 + i * 18),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 30,
    })
  );

  // Connector line grows — starts after all events started
  const connectorProgress = interpolate(
    frame,
    [20, 20 + events.length * 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.45, 0, 0.55, 1),
    }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 80px",
        boxSizing: "border-box",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.03em",
            marginBottom: 60,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontFamily: "Inter, sans-serif",
            alignSelf: "flex-start",
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: isVertical ? 0 : 0,
          width: "100%",
          flex: 1,
        }}
      >
        {/* Spine line */}
        {isVertical ? (
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 0,
              width: 3,
              height: `${connectorProgress * 100}%`,
              backgroundColor: accentColor,
              borderRadius: 3,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 0,
              height: 3,
              width: `${connectorProgress * 100}%`,
              backgroundColor: accentColor,
              borderRadius: 3,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
        )}

        {/* Events */}
        {events.map((event, i) => {
          const sp = eventSprings[i];
          const translateX = isVertical
            ? interpolate(sp, [0, 1], [-30, 0])
            : 0;
          const translateY = isVertical
            ? 0
            : interpolate(sp, [0, 1], [30, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: isVertical ? "row" : "column",
                alignItems: isVertical ? "flex-start" : "center",
                gap: isVertical ? 24 : 16,
                opacity: sp,
                transform: `translate(${translateX}px, ${translateY}px)`,
                paddingBottom: isVertical ? 40 : 0,
                paddingRight: isVertical ? 0 : 40,
                flex: isVertical ? undefined : 1,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  flexShrink: 0,
                  backgroundColor: event.highlight ? accentColor : "#1e293b",
                  border: `3px solid ${accentColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: event.highlight ? `0 0 24px ${accentColor}` : `0 0 10px rgba(0,0,0,0.5)`,
                  zIndex: 1,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: event.highlight ? "#0f172a" : accentColor, fontFamily: "Inter, sans-serif" }}>
                  {event.year}
                </span>
              </div>

              {/* Text */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: isVertical ? "left" : "center" }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: event.highlight ? accentColor : "#f1f5f9",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {event.label}
                </span>
                {event.description && (
                  <span
                    style={{
                      fontSize: 17,
                      color: "#94a3b8",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.5,
                      maxWidth: 300,
                    }}
                  >
                    {event.description}
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
