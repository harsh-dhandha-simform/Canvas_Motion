import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { stepAt } from "./_shared/anim";
import { generateKDTreeSteps, Pt } from "./KDTree.steps";

export const KDTreeSchema = z.object({
  title: z.string().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type KDTreeProps = z.infer<typeof KDTreeSchema>;

const X_COLOR = "#38bdf8";
const Y_COLOR = "#f59e0b";

export const KDTree: React.FC<KDTreeProps> = ({
  title,
  points,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const { steps } = React.useMemo(() => generateKDTreeSteps(points as Pt[]), [points]);

  const stepFrames = Math.max(1, Math.round((0.8 / speed) * fps));
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

  const drawFrac = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
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
        </h2>
      )}

      {/* legend */}
      <div style={{ position: "absolute", top: 66, right: 130, display: "flex", gap: 20, fontSize: 18, fontWeight: 700 }}>
        <span style={{ color: X_COLOR }}>│ x-split</span>
        <span style={{ color: Y_COLOR }}>─ y-split</span>
      </div>

      <svg width={videoWidth} height={videoHeight} style={{ position: "absolute", inset: 0 }}>
        <rect x={ox} y={oy} width={side} height={side} fill="#0f172a" stroke="#475569" strokeWidth={2} />
        {step.lines.map((ln, i) => {
          const isLast = i === step.lines.length - 1 && step.kind === "insert";
          const f = isLast ? drawFrac : 1;
          if (ln.axis === "x") {
            const x = sx(ln.pos);
            const y1 = sy(ln.a);
            const y2 = sy(ln.a + (ln.b - ln.a) * f);
            return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke={X_COLOR} strokeWidth={2.5} opacity={0.85} />;
          }
          const y = sy(ln.pos);
          const x1 = sx(ln.a);
          const x2 = sx(ln.a + (ln.b - ln.a) * f);
          return <line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke={Y_COLOR} strokeWidth={2.5} opacity={0.85} />;
        })}
        {step.points.map((p, i) => {
          const isActive = step.activePoint && step.activePoint.x === p.x && step.activePoint.y === p.y;
          const isCompare = step.comparePoint && step.comparePoint.x === p.x && step.comparePoint.y === p.y;
          return (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={isActive ? 11 : 8}
              fill={isActive ? accent : isCompare ? "#f8fafc" : "#cbd5e1"}
              stroke={isCompare ? accent : "#0b1220"}
              strokeWidth={isCompare ? 3 : 2}
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
          fontFamily: "monospace",
          color: accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
