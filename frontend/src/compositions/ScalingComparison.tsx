import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ScalingScene } from "../scenes/ScalingScene";

export const ScalingComparison: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow ambient drift coordinates
  const glow1X = 300 + Math.sin(frame * 0.015) * 80;
  const glow1Y = 400 + Math.cos(frame * 0.02) * 60;

  const glow2X = 1500 + Math.cos(frame * 0.012) * 100;
  const glow2Y = 700 + Math.sin(frame * 0.018) * 80;

  // Grid background animated offset (slow panning down)
  const gridOffsetY = (frame * 0.4) % 60;

  return (
    <AbsoluteFill className="bg-slate-950 overflow-hidden relative font-sans">
      {/* 1. Deep Space Base Background */}
      <div className="absolute inset-0 bg-[#070b13]" />

      {/* 2. Slow drifting Ambient Light Leaks */}
      <div
        style={{
          position: "absolute",
          left: glow1X - 500,
          top: glow1Y - 500,
          width: 1000,
          height: 1000,
          background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 70%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: glow2X - 600,
          top: glow2Y - 600,
          width: 1200,
          height: 1200,
          background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(0,0,0,0) 80%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* 3. Futuristic Animated Grid Overlay */}
      <div
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(51, 65, 85, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(51, 65, 85, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundPosition: `0px ${gridOffsetY}px`,
          opacity: 0.8,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* 4. Fine Dot Grid intersections for technical depth */}
      <div
        style={{
          backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          backgroundPosition: `0px ${gridOffsetY}px`,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* 5. Main Scaling Scene Orchestrator */}
      <ScalingScene />
    </AbsoluteFill>
  );
};
