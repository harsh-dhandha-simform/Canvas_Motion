import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateSieveSteps } from "./SieveOfEratosthenes.steps";

export const SieveOfEratosthenesSchema = z.object({
  title: z.string().optional(),
  n: z.number().optional(),
  cols: z.number().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type SieveOfEratosthenesProps = z.infer<typeof SieveOfEratosthenesSchema>;

export const SieveOfEratosthenes: React.FC<SieveOfEratosthenesProps> = ({
  title,
  n = 40,
  cols = 10,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(() => generateSieveSteps(n), [n]);

  const stepFrames = Math.max(1, Math.round((0.4 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const count = n - 1; // numbers 2..n
  const rows = Math.ceil(count / cols);
  const areaW = videoWidth - 240;
  const areaH = videoHeight - 320;
  const cell = Math.min(areaW / cols, areaH / rows, 120);
  const gridW = cols * cell;
  const startX = (videoWidth - gridW) / 2;
  const startY = 190;

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const done = step.kind === "settle";

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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>n = {n}</span>
        </h2>
      )}

      {Array.from({ length: count }).map((_, k) => {
        const num = k + 2;
        const r = Math.floor(k / cols);
        const c = k % cols;
        const crossed = step.crossed[num];
        const isPrimeNow = step.currentPrime === num;
        const isMultiple = step.currentMultiple === num;
        const survivesAsPrime = !crossed;

        let bg = "#1e293b";
        let border = "#334155";
        let color = "#f1f5f9";
        if (crossed) {
          bg = "#0f172a";
          border = "#1e293b";
          color = "#475569";
        } else if (done) {
          bg = mix("#1e293b", "#22c55e", 0.4);
          border = "#22c55e";
        }
        if (isPrimeNow) {
          bg = mix("#1e293b", accent, 0.55 * glow);
          border = accent;
          color = "#f8fafc";
        }
        if (isMultiple) {
          bg = mix("#1e293b", "#ef4444", 0.55);
          border = "#ef4444";
          color = "#f8fafc";
        }

        return (
          <div
            key={num}
            style={{
              position: "absolute",
              left: startX + c * cell,
              top: startY + r * cell,
              width: cell - 6,
              height: cell - 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: bg,
              border: `2px solid ${border}`,
              color,
              fontSize: Math.min(30, cell * 0.36),
              fontWeight: 800,
              textDecoration: crossed && !survivesAsPrime ? "line-through" : undefined,
              boxSizing: "border-box",
              boxShadow: isPrimeNow ? `0 0 14px ${accent}80` : undefined,
            }}
          >
            {num}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 34,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: step.kind === "cross" ? "#ef4444" : done ? "#22c55e" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
