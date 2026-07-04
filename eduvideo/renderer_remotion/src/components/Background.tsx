/**
 * Background.tsx
 * 
 * Renders an animated, theme-aware background behind the video content.
 * Supports different variants (e.g. "glow", "grid") which the SceneWrapper
 * automatically switches between based on the components present in the scene.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { useTheme } from "../ThemeContext";

/**
 * Theme-driven animated background. A slow drifting radial-gradient glow over a
 * subtle grid — gives scenes depth instead of a flat fill. Deterministic
 * (frame-driven only, no Math.random).
 *
 * `variant` lets diagram-heavy scenes use the grid and title scenes a softer glow.
 */
export const Background: React.FC<{ variant?: "glow" | "grid" }> = ({
  variant = "glow",
}) => {
  const frame = useCurrentFrame();
  const theme = useTheme();

  // slow drift so it never feels static
  const gx = interpolate(frame % 600, [0, 300, 600], [30, 70, 30]);
  const gy = interpolate(frame % 480, [0, 240, 480], [35, 65, 35]);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background, overflow: "hidden" }}>
      {/* drifting primary glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${gx}% ${gy}%, ${theme.primary}22 0%, transparent 45%)`,
        }}
      />
      {/* secondary accent glow, opposite drift */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${100 - gx}% ${100 - gy}%, ${theme.secondary}18 0%, transparent 50%)`,
        }}
      />
      {variant === "grid" && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${theme.primary}0d 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}0d 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 80%)",
          }}
        />
      )}
      {/* subtle vignette for focus */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
