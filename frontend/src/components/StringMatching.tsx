import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateStringMatchSteps, MatchAlgorithm } from "./StringMatching.steps";

export const StringMatchingSchema = z.object({
  title: z.string().optional(),
  text: z.string(),
  pattern: z.string(),
  algorithm: z.enum(["naive", "kmp", "rabin-karp"]).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type StringMatchingProps = z.infer<typeof StringMatchingSchema>;

export const StringMatching: React.FC<StringMatchingProps> = ({
  title,
  text,
  pattern,
  algorithm = "kmp",
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateStringMatchSteps(text, pattern, algorithm as MatchAlgorithm),
    [text, pattern, algorithm],
  );

  const stepFrames = Math.max(1, Math.round((0.65 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const n = text.length;
  const gap = 8;
  const cellW = Math.min(64, (videoWidth - 220) / Math.max(1, n) - gap);
  const rowW = n * (cellW + gap) - gap;
  const startX = (videoWidth - rowW) / 2;
  const textY = videoHeight / 2 - 120;
  const patY = videoHeight / 2 + 10;
  const cellX = (i: number) => startX + i * (cellW + gap);

  const matchedRanges = new Set<number>();
  for (const s of step.matched) for (let j = 0; j < pattern.length; j++) matchedRanges.add(s + j);

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cmpColor =
    step.kind === "match" ? "#22c55e" : step.kind === "mismatch" ? "#ef4444" : accent;

  const box = (
    ch: string,
    x: number,
    y: number,
    opts: { border: string; bg: string; key: string; dim?: boolean },
  ) => (
    <div
      key={opts.key}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: cellW,
        height: cellW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        fontFamily: "monospace",
        fontSize: Math.min(34, cellW * 0.55),
        fontWeight: 800,
        color: opts.dim ? "#64748b" : "#f1f5f9",
        background: opts.bg,
        border: `2px solid ${opts.border}`,
      }}
    >
      {ch === " " ? "␣" : ch}
    </div>
  );

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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>{algorithm}</span>
        </h2>
      )}

      {step.patHash != null && (
        <div style={{ position: "absolute", top: 64, right: 90, fontFamily: "monospace", fontSize: 22, color: "#94a3b8" }}>
          pattern#{step.patHash} · window#{step.winHash}
        </div>
      )}

      {/* text row */}
      {text.split("").map((ch, i) => {
        const isMatched = matchedRanges.has(i);
        const isTi = step.ti === i;
        return box(ch, cellX(i), textY, {
          key: `t-${i}`,
          border: isTi ? cmpColor : isMatched ? "#22c55e" : "#475569",
          bg: isTi
            ? mix("#1e293b", cmpColor, 0.5 * glow)
            : isMatched
              ? mix("#1e293b", "#22c55e", 0.4)
              : "#1e293b",
        });
      })}

      {/* pattern row (shifted) */}
      {pattern.split("").map((ch, j) => {
        const isPj = step.pj === j;
        const col = step.shift + j;
        if (col < 0 || col >= n) return null;
        return box(ch, cellX(col), patY, {
          key: `p-${j}`,
          border: isPj ? cmpColor : "#334155",
          bg: isPj ? mix("#0b1220", cmpColor, 0.45) : "#0b1220",
          dim: !isPj,
        });
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
          fontFamily: "monospace",
          color: cmpColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
