import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const BeforeAfterTransformSchema = z.object({
  title: z.string().optional(),
  before: z.object({
    label: z.string(),
    content: z.array(z.string()),
    color: z.string().optional(),
  }),
  after: z.object({
    label: z.string(),
    content: z.array(z.string()),
    color: z.string().optional(),
  }),
  transformLabel: z.string().optional(),
  accentColor: z.string().optional(),
});

export type BeforeAfterTransformProps = z.infer<typeof BeforeAfterTransformSchema>;

export const BeforeAfterTransform: React.FC<BeforeAfterTransformProps> = ({
  title,
  before,
  after,
  transformLabel = "Transform",
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { ref, scale } = useContainerScale();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const beforeColor = before.color || "#ef4444";
  const afterColor = after.color || "#34d399";

  const beforeReveal = interpolate(frame, [8, 35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const arrowReveal = interpolate(frame, [32, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const afterReveal = interpolate(frame, [45, 72], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
          gap: "28px",
          alignItems: "stretch",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Before Panel */}
        <div
          style={{
            flex: 1,
            background: "#0a0f1e",
            border: `2px solid ${beforeColor}40`,
            borderRadius: 18,
            padding: "32px",
            boxShadow: `0 0 50px ${beforeColor}12`,
            opacity: beforeReveal,
            transform: `translateY(${interpolate(beforeReveal, [0, 1], [24, 0])}px)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span
              style={{
                background: `${beforeColor}20`,
                color: beforeColor,
                padding: "5px 18px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 800,
                border: `1.5px solid ${beforeColor}50`,
                fontFamily: "monospace",
              }}
            >
              {before.label}
            </span>
          </div>

          <div style={{ height: 1, background: `${beforeColor}20`, marginBottom: 20 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {before.content.map((line, idx) => {
              const lineReveal = interpolate(beforeReveal, [idx * 0.05, idx * 0.05 + 0.15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={idx}
                  style={{
                    opacity: lineReveal,
                    transform: `translateX(${interpolate(lineReveal, [0, 1], [15, 0])}px)`,
                    fontFamily: "monospace",
                    fontSize: "20px",
                    color: "#cbd5e1",
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Transformation Indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            opacity: arrowReveal,
            width: "120px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              background: `${accentColor}18`,
              color: accentColor,
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 800,
              fontFamily: "monospace",
              textAlign: "center",
              border: `1px solid ${accentColor}33`,
              whiteSpace: "nowrap",
            }}
          >
            {transformLabel}
          </span>
          <span style={{ color: accentColor, fontSize: 44, lineHeight: 1 }}>→</span>
        </div>

        {/* After Panel */}
        <div
          style={{
            flex: 1,
            background: "#0a0f1e",
            border: `2px solid ${afterColor}40`,
            borderRadius: 18,
            padding: "32px",
            boxShadow: `0 0 50px ${afterColor}12`,
            opacity: afterReveal,
            transform: `translateY(${interpolate(afterReveal, [0, 1], [24, 0])}px)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span
              style={{
                background: `${afterColor}20`,
                color: afterColor,
                padding: "5px 18px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 800,
                border: `1.5px solid ${afterColor}50`,
                fontFamily: "monospace",
              }}
            >
              {after.label}
            </span>
          </div>

          <div style={{ height: 1, background: `${afterColor}20`, marginBottom: 20 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {after.content.map((line, idx) => {
              const lineReveal = interpolate(afterReveal, [idx * 0.05, idx * 0.05 + 0.15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={idx}
                  style={{
                    opacity: lineReveal,
                    transform: `translateX(${interpolate(lineReveal, [0, 1], [15, 0])}px)`,
                    fontFamily: "monospace",
                    fontSize: "20px",
                    color: "#cbd5e1",
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
