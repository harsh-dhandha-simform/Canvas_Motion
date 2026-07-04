import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateMonoStackSteps, MonoVariant } from "./MonotonicStack.steps";

export const MonotonicStackSchema = z.object({
  title: z.string().optional(),
  values: z.array(z.number()),
  variant: z.enum(["next-greater", "next-smaller", "prev-greater", "prev-smaller"]).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type MonotonicStackProps = z.infer<typeof MonotonicStackSchema>;

const CELL = 84;
const GAP = 14;

export const MonotonicStack: React.FC<MonotonicStackProps> = ({
  title,
  values,
  variant = "next-greater",
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateMonoStackSteps(values, variant as MonoVariant),
    [values, variant],
  );

  const stepFrames = Math.max(1, Math.round((0.9 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const n = values.length;
  const rowW = n * CELL + (n - 1) * GAP;
  const startX = (videoWidth - rowW) / 2;
  const arrY = 250;
  const cellX = (i: number) => startX + i * (CELL + GAP);

  const active = new Set(step.active);
  const inStack = new Set(step.stack);
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
            padding: "0 90px",
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>{variant}</span>
        </h2>
      )}

      {/* array + answer row */}
      {values.map((v, i) => {
        const isCurrent = step.current === i;
        const onStack = inStack.has(i);
        const isActive = active.has(i);
        const border = isCurrent ? accent : onStack ? "#38bdf8" : "#475569";
        const bg = isActive
          ? mix("#1e293b", accent, 0.5 * glow)
          : onStack
            ? mix("#1e293b", "#38bdf8", 0.3)
            : "#1e293b";
        const ans = step.answer[i];
        return (
          <div key={`c-${i}`}>
            <div
              style={{
                position: "absolute",
                left: cellX(i),
                top: arrY,
                width: CELL,
                height: CELL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: bg,
                border: `2px solid ${border}`,
                color: "#f1f5f9",
                fontSize: 30,
                fontWeight: 800,
                boxShadow: isActive ? `0 0 18px ${accent}70` : undefined,
              }}
            >
              {v}
            </div>
            <div style={{ position: "absolute", left: cellX(i), top: arrY + CELL + 6, width: CELL, textAlign: "center", fontSize: 15, color: "#64748b", fontWeight: 600 }}>
              i={i}
            </div>
            <div style={{ position: "absolute", left: cellX(i), top: arrY + CELL + 34, width: CELL, textAlign: "center", fontSize: 22, fontWeight: 800, color: ans == null ? "#334155" : "#22c55e" }}>
              {ans == null ? "—" : ans}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 90, top: arrY + CELL + 34, color: "#94a3b8", fontSize: 18, fontWeight: 700 }}>
        answer
      </div>

      {/* stack panel (top of stack on top) */}
      <div style={{ position: "absolute", left: startX, top: arrY + CELL + 110, display: "flex", flexDirection: "column-reverse", gap: 8 }}>
        <div style={{ color: "#38bdf8", fontSize: 18, fontWeight: 800, marginTop: 6 }}>stack (indices)</div>
        {step.stack.map((si, k) => (
          <div
            key={`s-${si}`}
            style={{
              width: 120,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: mix("#1e293b", "#38bdf8", 0.35),
              border: `2px solid ${k === step.stack.length - 1 ? accent : "#38bdf8"}`,
              color: "#f1f5f9",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            i={si} · {values[si]}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "pop" ? "#ef4444" : step.kind === "resolve" ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
