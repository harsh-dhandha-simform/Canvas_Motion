import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateIntervalSteps, IntervalInput } from "./IntervalScheduling.steps";

export const IntervalSchedulingSchema = z.object({
  title: z.string().optional(),
  intervals: z.array(z.object({ start: z.number(), end: z.number(), label: z.string().optional() })),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type IntervalSchedulingProps = z.infer<typeof IntervalSchedulingSchema>;

export const IntervalScheduling: React.FC<IntervalSchedulingProps> = ({
  title,
  intervals,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateIntervalSteps(intervals as IntervalInput[]),
    [intervals],
  );

  const stepFrames = Math.max(1, Math.round((1.0 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const minT = Math.min(...step.intervals.map((iv) => iv.start));
  const maxT = Math.max(...step.intervals.map((iv) => iv.end));
  const span = Math.max(1, maxT - minT);
  const padX = 130;
  const areaW = videoWidth - padX * 2;
  const tx = (t: number) => padX + ((t - minT) / span) * areaW;

  const rows = step.intervals.length;
  const listTop = 210;
  const rowH = Math.min(72, (videoHeight - listTop - 130) / Math.max(1, rows));
  const barH = rowH - 18;

  const selected = new Set(step.selected);
  const rejected = new Set(step.rejected);
  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
          <span style={{ color: "#22c55e", fontSize: 24, marginLeft: 16, fontWeight: 700 }}>
            {step.selected.length} selected
          </span>
        </h2>
      )}

      {/* last-selected end line */}
      {step.lastEnd !== null && (
        <div
          style={{
            position: "absolute",
            left: tx(step.lastEnd),
            top: listTop - 20,
            width: 2,
            height: rows * rowH + 20,
            background: "#22c55e",
            opacity: 0.6,
          }}
        />
      )}

      {step.intervals.map((iv, i) => {
        const isCurrent = step.current === iv.id;
        const isSel = selected.has(iv.id);
        const isRej = rejected.has(iv.id);
        const color = isSel ? "#22c55e" : isRej ? "#ef4444" : isCurrent ? accent : "#64748b";
        const bg = isCurrent ? mix("#1e293b", accent, 0.5 * glow) : mix("#0b1220", color, isSel || isRej ? 0.5 : 0.3);
        return (
          <div key={iv.id}>
            <div
              style={{
                position: "absolute",
                left: tx(iv.start),
                top: listTop + i * rowH,
                width: Math.max(barH, tx(iv.end) - tx(iv.start)),
                height: barH,
                borderRadius: 8,
                background: bg,
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f8fafc",
                fontSize: 22,
                fontWeight: 800,
                opacity: isRej ? 0.6 : 1,
                boxShadow: isCurrent ? `0 0 16px ${accent}70` : undefined,
                boxSizing: "border-box",
              }}
            >
              {iv.label}
            </div>
            <div style={{ position: "absolute", left: tx(iv.start), top: listTop + i * rowH + barH + 2, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              {iv.start}
            </div>
            <div style={{ position: "absolute", left: tx(iv.end) - 18, top: listTop + i * rowH + barH + 2, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              {iv.end}
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "select" ? "#22c55e" : step.kind === "reject" ? "#ef4444" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
