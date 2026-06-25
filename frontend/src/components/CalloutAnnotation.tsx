import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const CalloutAnnotationSchema = z.object({
  title: z.string().optional(),
  /** The main content area text (centered, large). */
  body: z.string(),
  /** Optional supporting bullet points below the body. */
  bullets: z.array(z.string()).optional(),
  /** Where the callout sits on screen — "left" | "right" | "top" | "bottom". */
  position: z.enum(["left", "right", "top", "bottom"]).optional(),
  accentColor: z.string().optional(),
});

export type CalloutAnnotationProps = z.infer<typeof CalloutAnnotationSchema>;

export const CalloutAnnotation: React.FC<CalloutAnnotationProps> = ({
  title,
  body,
  bullets = [],
  position = "right",
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Container spring
  const containerSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 110 },
    durationInFrames: 35,
  });

  // Pulse on the corner decoration
  const pulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.6, 1]);

  // Determine position offsets
  const isLeading = position === "left" || position === "top";

  const arrowStyle: React.CSSProperties = {};
  if (position === "left") arrowStyle.right = -28;
  if (position === "right") arrowStyle.left = -28;
  if (position === "top") arrowStyle.bottom = -28;
  if (position === "bottom") arrowStyle.top = -28;

  const bulletSprings = bullets.map((_, i) =>
    spring({
      frame: frame - (35 + i * 8),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 25,
    })
  );

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
            fontSize: 36,
            fontWeight: 800,
            color: "#cbd5e1",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: 0,
            marginBottom: 32,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Big background quote mark */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 80,
            fontSize: 320,
            lineHeight: 1,
            color: accentColor,
            opacity: 0.08,
            fontFamily: "Georgia, serif",
            pointerEvents: "none",
          }}
        >
          “
        </div>

        <div
          style={{
            position: "relative",
            maxWidth: 1200,
            backgroundColor: "rgba(15, 23, 41, 0.92)",
            border: `2px solid ${accentColor}`,
            borderRadius: 22,
            padding: "44px 56px",
            boxShadow: `0 30px 80px -20px rgba(0,0,0,0.7), 0 0 40px -8px ${accentColor}80`,
            opacity: containerSpring,
            transform: `scale(${interpolate(containerSpring, [0, 1], [0.92, 1])})`,
          }}
        >
          {/* Corner decoration */}
          <div
            style={{
              position: "absolute",
              top: -1,
              left: -1,
              width: 36,
              height: 36,
              borderTop: `4px solid ${accentColor}`,
              borderLeft: `4px solid ${accentColor}`,
              borderTopLeftRadius: 22,
              opacity: pulse,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 36,
              height: 36,
              borderTop: `4px solid ${accentColor}`,
              borderRight: `4px solid ${accentColor}`,
              borderTopRightRadius: 22,
              opacity: pulse,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 36,
              height: 36,
              borderBottom: `4px solid ${accentColor}`,
              borderLeft: `4px solid ${accentColor}`,
              borderBottomLeftRadius: 22,
              opacity: pulse,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 36,
              height: 36,
              borderBottom: `4px solid ${accentColor}`,
              borderRight: `4px solid ${accentColor}`,
              borderBottomRightRadius: 22,
              opacity: pulse,
            }}
          />

          {/* Body */}
          <p
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 600,
              color: "#f1f5f9",
              lineHeight: 1.45,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            {body}
          </p>

          {/* Bullets */}
          {bullets.length > 0 && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingTop: 20,
                borderTop: `1px solid ${accentColor}33`,
              }}
            >
              {bullets.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    opacity: bulletSprings[i],
                    transform: `translateX(${interpolate(
                      bulletSprings[i],
                      [0, 1],
                      [isLeading ? -16 : 16, 0]
                    )}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      marginTop: 12,
                      flexShrink: 0,
                      boxShadow: `0 0 10px ${accentColor}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 20,
                      color: "#cbd5e1",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    {b}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Side arrow */}
          <div
            style={{
              position: "absolute",
              ...arrowStyle,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1,
              textShadow: `0 0 12px ${accentColor}`,
            }}
          >
            {position === "left" && "→"}
            {position === "right" && "←"}
            {position === "top" && "↓"}
            {position === "bottom" && "↑"}
          </div>
        </div>
      </div>
    </div>
  );
};