import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { useTheme } from "../ThemeContext";
import type { Caption } from "../DynamicVideo";

/**
 * CaptionLayer.tsx
 * 
 * On-screen textual explanation. Renders the narration as a lower-third caption,
 * synced to the absolute video timeline via the caption startMs/endMs.
 *
 * Mounted at the Composition root (NOT inside a Sequence) so useCurrentFrame()
 * is the absolute frame and maps directly to milliseconds.
 */
export const CaptionLayer: React.FC<{ captions?: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const theme = useTheme();

  if (!captions || captions.length === 0) return null;

  const ms = (frame / fps) * 1000;
  const active = captions.find((c) => ms >= c.startMs && ms < c.endMs);
  if (!active) return null;

  const localMs = ms - active.startMs;
  const durMs = Math.max(1, active.endMs - active.startMs);
  const localFrames = (localMs / 1000) * fps;
  const durFrames = (durMs / 1000) * fps;

  // Fade scales with duration so the input range stays strictly increasing
  // even for very short caption chunks (fade < durFrames/2 always holds).
  const fade = Math.min(6, durFrames / 3);
  const opacity = interpolate(
    localFrames,
    [0, fade, durFrames - fade, durFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const translateY = interpolate(localFrames, [0, 8], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: Math.round(height * 0.05), // ~54px on 1080p
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div
          style={{
            maxWidth: "75%",
            padding: `${Math.round(height * 0.015)}px ${Math.round(height * 0.03)}px`, // ~16px 32px
            borderRadius: Math.round(height * 0.013), // ~14px
            background: "rgba(3, 7, 17, 0.72)",
            backdropFilter: "blur(8px)",
          border: `1px solid ${theme.primary}40`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.45)`,
          borderLeft: `4px solid ${theme.accent}`,
        }}
      >
        <span
          style={{
            fontSize: Math.round(height * 0.032), // ~34px on 1080p
            lineHeight: 1.35,
            fontWeight: 600,
            color: "#f1f5f9",
            textAlign: "center",
            display: "block",
            letterSpacing: "-0.01em",
          }}
        >
          {active.text}
        </span>
      </div>
    </div>
  );
};
