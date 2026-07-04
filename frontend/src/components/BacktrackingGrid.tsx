import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateQueensSteps } from "./BacktrackingGrid.steps";

export const BacktrackingGridSchema = z.object({
  title: z.string().optional(),
  puzzle: z.enum(["n-queens"]).optional(),
  n: z.number().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type BacktrackingGridProps = z.infer<typeof BacktrackingGridSchema>;

export const BacktrackingGrid: React.FC<BacktrackingGridProps> = ({
  title,
  n = 6,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(() => generateQueensSteps(n), [n]);

  const stepFrames = Math.max(1, Math.round((0.55 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const areaH = videoHeight - 300;
  const size = Math.min(areaH / n, (videoWidth - 240) / n, 130);
  const boardW = size * n;
  const startX = (videoWidth - boardW) / 2;
  const startY = 190;

  const conflicts = new Set(step.conflicts);
  const solved = step.kind === "solved" || (step.kind === "settle" && step.board.every((c) => c >= 0));
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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>{n}-queens</span>
        </h2>
      )}

      {Array.from({ length: n }).map((_, r) =>
        Array.from({ length: n }).map((__, c) => {
          const id = r * n + c;
          const dark = (r + c) % 2 === 1;
          const hasQueen = step.board[r] === c;
          const isActive = step.active && step.active.r === r && step.active.c === c;
          const isConflict = conflicts.has(id);
          const trying = isActive && step.kind === "try";
          const rejecting = isActive && (step.kind === "conflict" || step.kind === "backtrack");

          let bg = dark ? "#1e293b" : "#0f172a";
          let border = "#1f2937";
          if (isConflict) {
            bg = mix(bg, "#ef4444", 0.5);
            border = "#ef4444";
          }
          if (isActive) {
            border = rejecting ? "#ef4444" : accent;
            bg = mix(bg, rejecting ? "#ef4444" : accent, 0.4 * glow);
          }

          const queenColor = solved
            ? "#22c55e"
            : isConflict
              ? "#ef4444"
              : hasQueen
                ? "#f1f5f9"
                : "#f8fafc";

          return (
            <div
              key={id}
              style={{
                position: "absolute",
                left: startX + c * size,
                top: startY + r * size,
                width: size,
                height: size,
                background: bg,
                border: `2px solid ${border}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.6,
                boxShadow: isActive ? `0 0 16px ${rejecting ? "#ef4444" : accent}80` : undefined,
              }}
            >
              {hasQueen && <span style={{ color: queenColor }}>♛</span>}
              {trying && !hasQueen && <span style={{ color: accent, opacity: 0.5 }}>♛</span>}
            </div>
          );
        }),
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
          color:
            step.kind === "solved"
              ? "#22c55e"
              : step.kind === "conflict" || step.kind === "backtrack"
                ? "#ef4444"
                : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
