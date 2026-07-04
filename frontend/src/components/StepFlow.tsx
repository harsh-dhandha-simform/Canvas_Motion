import React from "react";
import { interpolate, Easing, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const StepFlowSchema = z.object({
  title: z.string(),
  steps: z.array(
    z.object({
      label: z.string(),
      description: z.string().optional(),
    })
  ),
  accentColor: z.string().optional(),
  layout: z.enum(["horizontal", "vertical"]).optional(),
});

interface StepFlowProps {
  title: string;
  steps: Array<{
    label: string;
    description?: string;
  }>;
  accentColor?: string;
  layout?: "horizontal" | "vertical";
}

export const StepFlow: React.FC<StepFlowProps> = ({
  title,
  steps,
  accentColor = "#38BDF8",
  layout = "horizontal",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  const isVertical = layout === "vertical";

  // Stagger reveal of steps
  const stepSprings = steps.map((_, i) =>
    spring({
      frame: frame - i * 15,
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 30,
    })
  );

  // Connector line progress
  const connectorProgress = interpolate(
    frame,
    [10, 10 + steps.length * 15],
    [0, 100],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <div
      ref={ref}
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
      {/* Title section remains fixed and stable */}
      <h2
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "48px",
          fontWeight: 900,
          color: "#f1f5f9",
          letterSpacing: "-0.02em",
          marginBottom: isVertical ? "40px" : "60px",
          textAlign: "center",
        }}
      >
        {title}
      </h2>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isVertical ? "flex-start" : "center",
          width: "100%",
          maxWidth: "1100px",
          flex: 1,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          paddingLeft: isVertical ? "40px" : 0,
        }}
      >
        {/* Connector Line Base */}
        {isVertical ? (
          <div
            style={{
              position: "absolute",
              left: "28px",
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#1e293b",
              zIndex: -1,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: "32px",
              left: 0,
              right: 0,
              height: "4px",
              backgroundColor: "#1e293b",
              zIndex: -1,
            }}
          />
        )}

        {/* Connector Line Animated */}
        {isVertical ? (
          <div
            style={{
              position: "absolute",
              left: "28px",
              top: 0,
              height: `${connectorProgress}%`,
              width: "4px",
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
              zIndex: -1,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: "32px",
              left: 0,
              width: `${connectorProgress}%`,
              height: "4px",
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
              zIndex: -1,
            }}
          />
        )}

        {steps.map((step, index) => {
          const sp = stepSprings[index];
          const opacity = sp;
          const scaleVal = interpolate(sp, [0, 1], [0.6, 1]);

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `scale(${scaleVal})`,
                display: "flex",
                flexDirection: isVertical ? "row" : "column",
                alignItems: isVertical ? "center" : "center",
                gap: isVertical ? "24px" : "16px",
                textAlign: isVertical ? "left" : "center",
                width: isVertical ? "100%" : `${100 / steps.length}%`,
                paddingBottom: isVertical ? "30px" : 0,
              }}
            >
              {/* Step Circle Badge */}
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: `4px solid ${accentColor}`,
                  boxShadow: `0 0 20px ${accentColor}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#0f172a",
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              {/* Text contents */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  maxWidth: isVertical ? "800px" : "180px",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#f1f5f9",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#94a3b8",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.4,
                    }}
                  >
                    {step.description}
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
