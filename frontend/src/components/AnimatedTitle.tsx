/**
 * AnimatedTitle.tsx
 * 
 * Renders a bold, animated title and optional subtitle with an animated underline.
 * Uses relative sizing based on video height instead of hardcoded pixels.
 */
import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";
import { usePanelSize } from "../PanelSizeContext";

export const AnimatedTitleSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  accentColor: z.string().optional(),
  align: z.enum(["center", "left"]).optional(),
});

interface AnimatedTitleProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  align?: "center" | "left";
  style?: React.CSSProperties;
  className?: string;
}

export const AnimatedTitle: React.FC<AnimatedTitleProps> = ({
  title,
  subtitle,
  accentColor = "#38BDF8",
  align = "center",
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { height, width } = usePanelSize();

  // Entry animation
  const opacity = interpolate(frame, [0, 25], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, 25], [30, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated underline reveal
  const lineScaleX = interpolate(frame, [10, 35], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isCenter = align === "center";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: isCenter ? "center" : "flex-start",
        textAlign: isCenter ? "center" : "left",
        padding: "0 6%",
        boxSizing: "border-box",
        userSelect: "none",
        ...style,
      }}
    >
      {subtitle && (
        <span
          style={{ 
            color: accentColor,
            fontSize: Math.round(height * 0.02), // ~22px
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: Math.round(height * 0.01), // ~10px
            filter: `drop-shadow(0 0 10px ${accentColor}33)`,
          }}
        >
          {subtitle}
        </span>
      )}
      <h1 
        style={{
          margin: 0,
          fontSize: Math.round(height * 0.06), // ~65px
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          maxWidth: width * 0.8,
        }}
      >
        {title}
      </h1>
      <div
        style={{
          width: Math.round(width * 0.08), // ~150px
          height: Math.max(3, Math.round(height * 0.005)), // ~5px
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          transform: `scaleX(${lineScaleX})`,
          transformOrigin: isCenter ? "center" : "left",
          marginTop: Math.round(height * 0.02), // ~20px
          borderRadius: Math.max(1, Math.round(height * 0.002)),
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
};
