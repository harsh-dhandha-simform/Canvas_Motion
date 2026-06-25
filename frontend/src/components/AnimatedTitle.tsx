import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

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

  const alignmentClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
      className={`w-full ${alignmentClass} select-none ${className || ""}`}
    >
      {subtitle && (
        <span
          style={{ color: accentColor }}
          className="text-lg md:text-xl font-bold tracking-widest uppercase mb-2 drop-shadow-[0_0_10px_rgba(56,189,248,0.2)]"
        >
          {subtitle}
        </span>
      )}
      <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight max-w-4xl">
        {title}
      </h1>
      <div
        style={{
          width: "120px",
          height: "4px",
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          transform: `scaleX(${lineScaleX})`,
          transformOrigin: align === "center" ? "center" : "left",
          marginTop: "16px",
          borderRadius: "2px",
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
};
