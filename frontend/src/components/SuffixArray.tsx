import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateSuffixArraySteps } from "./SuffixArray.steps";

export const SuffixArraySchema = z.object({
  title: z.string().optional(),
  text: z.string(),
  pattern: z.string(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type SuffixArrayProps = z.infer<typeof SuffixArraySchema>;

export const SuffixArray: React.FC<SuffixArrayProps> = ({
  title,
  text,
  pattern,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(() => generateSuffixArraySteps(text, pattern), [text, pattern]);

  const stepFrames = Math.max(1, Math.round((1.1 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const rows = step.order.length;
  const areaH = videoHeight - 300;
  const rowH = Math.min(58, areaH / Math.max(1, rows));
  const listTop = 190;
  const rowW = 520;
  const listLeft = videoWidth / 2 - rowW / 2 + 60;

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const found = step.kind === "found";
  const miss = step.kind === "miss";
  const stateColor = found ? "#22c55e" : miss ? "#ef4444" : accent;

  const inRange = (i: number) => step.lo != null && step.hi != null && i >= step.lo && i <= step.hi;

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
          {step.pattern != null && (
            <span style={{ color: stateColor, fontSize: 24, marginLeft: 16, fontWeight: 700, fontFamily: "monospace" }}>
              find "{step.pattern}"
            </span>
          )}
        </h2>
      )}

      {step.order.map((r, i) => {
        const isMid = step.mid === i;
        const isMatch = step.matchRow === i;
        const dim = step.kind === "search" && !inRange(i);
        const bg = isMid
          ? mix("#1e293b", stateColor, 0.5 * glow)
          : isMatch
            ? mix("#1e293b", "#22c55e", 0.4)
            : "#1e293b";
        const border = isMid ? stateColor : isMatch ? "#22c55e" : "#334155";
        return (
          <div
            key={`${r.index}-${i}`}
            style={{
              position: "absolute",
              left: listLeft,
              top: listTop + i * rowH,
              width: rowW,
              height: rowH - 6,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 14px",
              borderRadius: 8,
              background: bg,
              border: `2px solid ${border}`,
              opacity: dim ? 0.4 : 1,
              boxSizing: "border-box",
            }}
          >
            <span style={{ width: 34, textAlign: "center", color: accent, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>
              {r.index}
            </span>
            <span style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em" }}>
              {r.suffix}
            </span>
          </div>
        );
      })}

      {/* L / M / R pointers */}
      {step.kind === "search" && (
        <>
          {step.lo != null && (
            <div style={{ position: "absolute", left: listLeft - 54, top: listTop + step.lo * rowH + rowH / 2 - 16, color: "#38bdf8", fontSize: 22, fontWeight: 800 }}>L▸</div>
          )}
          {step.hi != null && (
            <div style={{ position: "absolute", left: listLeft - 54, top: listTop + step.hi * rowH + rowH / 2 - 16, color: "#38bdf8", fontSize: 22, fontWeight: 800 }}>R▸</div>
          )}
          {step.mid != null && (
            <div style={{ position: "absolute", left: listLeft + rowW + 12, top: listTop + step.mid * rowH + rowH / 2 - 16, color: stateColor, fontSize: 22, fontWeight: 800 }}>◂ mid</div>
          )}
        </>
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
          fontFamily: "monospace",
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
