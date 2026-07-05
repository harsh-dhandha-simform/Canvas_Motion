import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";
import { usePanelSize } from "../PanelSizeContext";

export const StepFlowSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  accentColor: z.string().optional(),
});

interface StepFlowProps {
  title: string;
  steps: string[];
  accentColor?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const StepFlow: React.FC<StepFlowProps> = ({
  title,
  steps,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { width: cw, height: ch } = usePanelSize();

  const safeSteps = steps ?? [];
  const n = Math.max(1, safeSteps.length);

  // Everything scales to the actual cell so steps never overlap and the connector
  // line sits on the circle centers — never struck through the labels.
  const pad = clamp(cw * 0.04, 24, 72);
  const titleFont = clamp(ch * 0.07, 22, 46);
  const rowW = cw - pad * 2;
  const stepW = rowW / n; // each step owns an equal slice → no horizontal overlap
  const circle = clamp(Math.min(stepW * 0.42, ch * 0.16), 32, 72);
  const numFont = circle * 0.44;
  const labelFont = clamp(Math.min(stepW * 0.145, ch * 0.05), 11, 22);
  const labelW = stepW * 0.9;
  const lineProgress = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: clamp(ch * 0.06, 16, 48),
          fontSize: titleFont,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        {title}
      </h2>

      {/* Circles align on one row; labels hang below. The connector line is pinned
          to the circles' vertical center (top: circle/2), so it can't cross text. */}
      <div style={{ position: "relative", width: rowW, display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            position: "absolute",
            top: circle / 2,
            left: stepW / 2,
            right: stepW / 2,
            height: 3,
            transform: "translateY(-50%)",
            background: "#1e293b",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: circle / 2,
            left: stepW / 2,
            height: 3,
            transform: "translateY(-50%)",
            background: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
            width: `${lineProgress * (rowW - stepW)}px`,
          }}
        />

        {safeSteps.map((step, index) => {
          const itemFrame = frame - index * 12;
          const opacity = interpolate(itemFrame, [0, 15], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = interpolate(itemFrame, [0, 15], [0.5, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={index}
              style={{
                width: stepW,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity,
              }}
            >
              <div
                style={{
                  width: circle,
                  height: circle,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: numFont,
                  fontWeight: 900,
                  color: "#0f172a",
                  background: "#ffffff",
                  border: `${Math.max(2, circle * 0.06)}px solid ${accentColor}`,
                  boxShadow: `0 0 20px ${accentColor}88`,
                  transform: `scale(${scale})`,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {index + 1}
              </div>
              <span
                style={{
                  marginTop: clamp(circle * 0.22, 8, 20),
                  width: labelW,
                  textAlign: "center",
                  fontSize: labelFont,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: "#e2e8f0",
                }}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
