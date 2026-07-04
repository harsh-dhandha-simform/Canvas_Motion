import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps } from "./_shared/anim";
import { generateArrayAlgorithmSteps } from "./ArrayAlgorithm.steps";

export const ArrayStepSchema = z.object({
  pointers: z.record(z.string(), z.number()),
  windowSum: z.number().optional(),
  note: z.string().optional(),
  result: z.enum([
    "found", "narrow-left", "narrow-right",
    "expand", "shrink", "advance",
  ]).optional(),
});

export const ArrayAlgorithmSchema = z.object({
  title: z.string().optional(),
  mode: z.enum(["binary-search", "sliding-window", "two-pointer"]),
  values: z.array(z.union([z.number(), z.string()])),
  target: z.union([z.number(), z.string()]).optional(),
  windowSize: z.number().optional(),
  steps: z.array(ArrayStepSchema).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type ArrayStep = z.infer<typeof ArrayStepSchema>;
export type ArrayAlgorithmProps = z.infer<typeof ArrayAlgorithmSchema>;

export const ArrayAlgorithm: React.FC<ArrayAlgorithmProps> = ({
  title, mode, values, target, windowSize,
  steps: explicitSteps, speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateArrayAlgorithmSteps(mode, values, target, windowSize)
  );

  if (steps.length === 0) {
    return (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        padding: "60px 80px", boxSizing: "border-box",
        background: theme.background, fontFamily: `${theme.font}, sans-serif`,
        position: "relative",
      }}>
        {title && (
          <h2 style={{
            fontSize: 48, fontWeight: 900, color: "#f1f5f9",
            letterSpacing: "-0.03em", margin: 0,
          }}>{title}</h2>
        )}
      </div>
    );
  }

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentIdx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(currentIdx, { stepFrames, frame, fps });

  const current = steps[currentIdx];
  const prev = steps[Math.max(0, currentIdx - 1)];
  const cellW = 80, gap = 10;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Interpolated pointer positions (in cell-index space)
  const pointerNames = Object.keys(current?.pointers ?? {});
  const pointerPositions: Record<string, number> = {};
  for (const name of pointerNames) {
    const prevPos = prev?.pointers[name] ?? current.pointers[name];
    const nowPos = current.pointers[name];
    pointerPositions[name] = interpolate(progress, [0, 1], [prevPos, nowPos], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }

  // For binary-search: excluded region opacity
  const isBinary = mode === "binary-search";
  const L = current.pointers.L, R = current.pointers.R;

  // Sliding-window box
  const wStart = pointerPositions.start;
  const wEnd = pointerPositions.end;

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      position: "relative",
    }}>
      {title && (
        <h2 style={{
          fontSize: 48, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", gap: 40, position: "relative",
      }}>
        {/* Sliding-window overlay */}
        {mode === "sliding-window" && wStart !== undefined && wEnd !== undefined && (
          <div style={{
            position: "absolute",
            left: `calc(50% + ${(wStart - values.length / 2) * (cellW + gap)}px)`,
            width: (wEnd - wStart + 1) * (cellW + gap) - gap,
            height: cellW + 40,
            top: `calc(50% - ${(cellW + 40) / 2}px)`,
            border: `3px solid ${accent}`,
            borderRadius: 12,
            background: `${accent}20`,
            boxShadow: `0 0 30px ${accent}50`,
          }} />
        )}

        {/* Cells */}
        <div style={{ display: "flex", gap, position: "relative", zIndex: 2 }}>
          {values.map((v, i) => {
            const excluded = isBinary && (i < L || i > R);
            const isFound = current.result === "found" && (
              (mode === "binary-search" && i === current.pointers.M) ||
              (mode === "two-pointer" && (i === current.pointers.i || i === current.pointers.j))
            );
            return (
              <div key={i} style={{
                width: cellW, height: cellW,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isFound ? mix("#1e293b", accent, 0.8) : "#1e293b",
                border: `2px solid ${isFound ? accent : "#334155"}`,
                borderRadius: 8,
                color: "#f1f5f9", fontSize: 28, fontWeight: 700,
                opacity: excluded ? interpolate(progress, [0, 1], [1, 0.3], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                }) : 1,
                boxShadow: isFound ? `0 0 30px ${accent}80` : undefined,
                position: "relative",
              }}>
                {v}
                <span style={{
                  position: "absolute", bottom: -26, color: "#64748b", fontSize: 14,
                }}>{i}</span>
              </div>
            );
          })}
        </div>

        {/* Pointer markers */}
        <div style={{
          position: "relative", width: values.length * (cellW + gap) - gap, height: 60,
          marginTop: 30,
        }}>
          {Object.entries(pointerPositions).map(([name, pos]) => (
            <div key={name} style={{
              position: "absolute",
              left: pos * (cellW + gap) + cellW / 2 - 20,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: name === "M" || name === "start" ? theme.primary : accent,
            }}>
              <span style={{ fontSize: 24 }}>▲</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Running window sum */}
        {mode === "sliding-window" && typeof current.windowSum === "number" && (
          <div style={{
            fontSize: 28, fontWeight: 800, color: accent,
            textShadow: `0 0 20px ${accent}80`,
          }}>
            sum = {current.windowSum}
          </div>
        )}

        {current.note && (
          <div style={{ color: "#94a3b8", fontSize: 20 }}>{current.note}</div>
        )}
      </div>

      {typeof target !== "undefined" && (
        <div style={{
          position: "absolute", top: 60, right: 80,
          color: "#f1f5f9", fontSize: 20,
        }}>target: <strong style={{ color: accent }}>{target}</strong></div>
      )}
    </div>
  );
};
