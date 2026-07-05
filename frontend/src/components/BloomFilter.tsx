import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateBloomSteps, BloomOperation } from "./BloomFilter.steps";

export const BloomFilterSchema = z.object({
  title: z.string().optional(),
  size: z.number().optional(),
  k: z.number().optional(),
  operations: z.array(
    z.object({ op: z.enum(["insert", "query"]), key: z.string() }),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type BloomFilterProps = z.infer<typeof BloomFilterSchema>;

export const BloomFilter: React.FC<BloomFilterProps> = ({
  title,
  size = 16,
  k = 3,
  operations,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateBloomSteps(operations as BloomOperation[], size, k),
    [operations, size, k],
  );

  const stepFrames = Math.max(1, Math.round((1.1 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const m = step.size;
  const gap = 10;
  const cell = Math.min(80, (videoWidth - 240) / m - gap);
  const rowW = m * (cell + gap) - gap;
  const startX = (videoWidth - rowW) / 2;
  const rowY = 430;
  const cellX = (i: number) => startX + i * (cell + gap);

  const activeSet = new Set(step.activeBits);
  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isInsert = step.kind === "hash" || step.kind === "set";
  const stateColor =
    step.result === "maybe" ? "#f59e0b" : step.result === "no" ? "#22c55e" : accent;

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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>k = {step.k}</span>
        </h2>
      )}

      {/* current key + hashed positions */}
      {step.key && (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 30,
            fontFamily: "monospace",
            color: isInsert ? accent : stateColor,
            fontWeight: 700,
          }}
        >
          {isInsert ? "insert" : "query"} "{step.key}" → [{step.activeBits.join(", ")}]
        </div>
      )}

      {/* bit array */}
      {step.bits.map((b, i) => {
        const isActive = activeSet.has(i);
        return (
          <div key={i} style={{ position: "absolute", left: cellX(i), top: rowY }}>
            <div
              style={{
                width: cell,
                height: cell,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                fontSize: 30,
                fontWeight: 800,
                color: b ? "#f8fafc" : "#475569",
                background: isActive
                  ? mix("#1e293b", stateColor, 0.55 * glow)
                  : b
                    ? mix("#1e293b", accent, 0.35)
                    : "#0f172a",
                border: `2px solid ${isActive ? stateColor : b ? accent : "#1e293b"}`,
                boxShadow: isActive ? `0 0 16px ${stateColor}80` : undefined,
              }}
            >
              {b ? 1 : 0}
            </div>
            <div style={{ width: cell, textAlign: "center", fontSize: 14, color: "#64748b", marginTop: 6, fontWeight: 600 }}>{i}</div>
          </div>
        );
      })}

      {/* result badge */}
      {step.result && (
        <div
          style={{
            position: "absolute",
            top: 600,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 34,
            fontWeight: 900,
            color: stateColor,
          }}
        >
          {step.result === "maybe" ? "⚠ possibly present" : "✓ definitely not present"}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
