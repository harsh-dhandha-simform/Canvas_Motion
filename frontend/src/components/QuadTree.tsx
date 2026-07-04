import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { stepAt } from "./_shared/anim";
import { generateQuadTreeSteps, Pt } from "./QuadTree.steps";

export const QuadTreeSchema = z.object({
  title: z.string().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  capacity: z.number().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type QuadTreeProps = z.infer<typeof QuadTreeSchema>;

export const QuadTree: React.FC<QuadTreeProps> = ({
  title,
  points,
  capacity = 1,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateQuadTreeSteps(points as Pt[], capacity),
    [points, capacity],
  );

  const stepFrames = Math.max(1, Math.round((0.85 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const side = Math.min(videoWidth - 260, videoHeight - 300);
  const ox = (videoWidth - side) / 2;
  const oy = 170;
  const sx = (v: number) => ox + v * side;
  const sy = (v: number) => oy + v * side;

  const pop = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.6)),
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: theme.background,
        fontFamily: `${theme.font}, sans-serif`,
        padding: "56px 0 0",
        boxSizing: "border-box",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 46,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.03em",
            margin: 0,
            padding: "0 130px",
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>capacity {step.capacity}</span>
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight} style={{ position: "absolute", inset: 0 }}>
        {/* outer boundary */}
        <rect x={ox} y={oy} width={side} height={side} fill="#0f172a" stroke="#475569" strokeWidth={2} />
        {/* leaf rects */}
        {step.rects.map((r, i) => (
          <rect
            key={i}
            x={sx(r.x)}
            y={sy(r.y)}
            width={r.w * side}
            height={r.h * side}
            fill="none"
            stroke="#334155"
            strokeWidth={1.5}
          />
        ))}
        {/* points */}
        {step.points.map((p, i) => {
          const isActive = step.activePoint && step.activePoint.x === p.x && step.activePoint.y === p.y;
          return (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={isActive ? 12 * pop + 4 : 9}
              fill={isActive ? accent : "#38bdf8"}
              stroke="#f8fafc"
              strokeWidth={2}
              style={{ filter: isActive ? `drop-shadow(0 0 12px ${accent})` : undefined }}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "subdivide" ? "#f59e0b" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
