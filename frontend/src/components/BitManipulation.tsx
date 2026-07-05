import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateBitSteps, BitOperation } from "./BitManipulation.steps";

export const BitManipulationSchema = z.object({
  title: z.string().optional(),
  value: z.number(),
  width: z.number().optional(),
  operations: z.array(
    z.union([
      z.object({ op: z.enum(["and", "or", "xor"]), mask: z.number() }),
      z.object({ op: z.enum(["shl", "shr"]), by: z.number() }),
      z.object({ op: z.enum(["set", "clear", "toggle"]), bit: z.number() }),
      z.object({ op: z.literal("not") }),
      z.object({ op: z.literal("popcount") }),
    ]),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type BitManipulationProps = z.infer<typeof BitManipulationSchema>;

export const BitManipulation: React.FC<BitManipulationProps> = ({
  title,
  value,
  width = 8,
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
    () => generateBitSteps(value, operations as BitOperation[], width),
    [value, operations, width],
  );

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const w = step.width;
  const gap = 12;
  const cell = Math.min(96, (videoWidth - 360) / w - gap);
  const rowW = w * (cell + gap) - gap;
  const startX = (videoWidth - rowW) / 2 + 40;

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const changed = new Set(step.changed);

  const row = (
    bits: (0 | 1)[],
    y: number,
    label: string,
    opts: { highlight?: boolean; rowKey: string },
  ) => (
    <React.Fragment key={opts.rowKey}>
      <div style={{ position: "absolute", left: startX - 150, top: y + cell / 2 - 16, width: 130, textAlign: "right", color: "#94a3b8", fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>
        {label}
      </div>
      {bits.map((b, i) => {
        const hot = opts.highlight && changed.has(i);
        return (
          <div
            key={`${opts.rowKey}-${i}`}
            style={{
              position: "absolute",
              left: startX + i * (cell + gap),
              top: y,
              width: cell,
              height: cell,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              fontSize: Math.min(40, cell * 0.5),
              fontWeight: 800,
              fontFamily: "monospace",
              color: b ? "#f8fafc" : "#475569",
              background: hot ? mix("#1e293b", accent, 0.6 * glow) : b ? mix("#1e293b", accent, 0.3) : "#0f172a",
              border: `2px solid ${hot ? accent : b ? accent : "#1e293b"}`,
              boxShadow: hot ? `0 0 16px ${accent}80` : undefined,
            }}
          >
            {b}
          </div>
        );
      })}
    </React.Fragment>
  );

  const hasResult = step.resultBits !== null;
  const hasOperand = step.operandBits !== null;
  const topY = 250;
  const opY = topY + cell + 30;
  const resY = hasOperand ? opY + cell + 30 : topY + cell + 40;

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
          {step.opSymbol && (
            <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700, fontFamily: "monospace" }}>
              {step.opSymbol}
            </span>
          )}
        </h2>
      )}

      {/* bit index labels */}
      {Array.from({ length: w }).map((_, i) => (
        <div key={`ix-${i}`} style={{ position: "absolute", left: startX + i * (cell + gap), top: topY - 34, width: cell, textAlign: "center", fontSize: 15, color: "#64748b", fontWeight: 600 }}>
          {w - 1 - i}
        </div>
      ))}

      {row(step.topBits, topY, "x", { rowKey: "top", highlight: step.kind === "popcount" })}
      {hasOperand && step.operandBits && row(step.operandBits, opY, step.opSymbol.split(" ")[0].toLowerCase(), { rowKey: "operand" })}
      {hasResult && step.resultBits && row(step.resultBits, resY, "=", { rowKey: "res", highlight: true })}

      {step.popcount !== null && (
        <div style={{ position: "absolute", top: resY, left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 900, color: accent }}>
          popcount = {step.popcount}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 26,
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
