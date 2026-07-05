import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateAStarSteps, Cell, Heuristic } from "./AStarPathfinding.steps";

const cellSchema = z.tuple([z.number(), z.number()]);

export const AStarPathfindingSchema = z.object({
  title: z.string().optional(),
  rows: z.number(),
  cols: z.number(),
  walls: z.array(cellSchema).optional(),
  start: cellSchema,
  goal: cellSchema,
  heuristic: z.enum(["manhattan", "euclidean"]).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type AStarPathfindingProps = z.infer<typeof AStarPathfindingSchema>;

export const AStarPathfinding: React.FC<AStarPathfindingProps> = ({
  title,
  rows,
  cols,
  walls = [],
  start,
  goal,
  heuristic = "manhattan",
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateAStarSteps(rows, cols, walls as Cell[], start as Cell, goal as Cell, heuristic as Heuristic),
    [rows, cols, walls, start, goal, heuristic],
  );

  const stepFrames = Math.max(1, Math.round((0.6 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const areaW = videoWidth - 220;
  const areaH = videoHeight - 320;
  const size = Math.min(areaW / cols, areaH / rows, 130);
  const gridW = size * cols;
  const startX = (videoWidth - gridW) / 2;
  const startY = 200;

  const id = (r: number, c: number) => r * cols + c;
  const wallSet = new Set(walls.map(([r, c]) => id(r, c)));
  const openSet = new Set(step.open);
  const closedSet = new Set(step.closed);
  const pathSet = new Set(step.path);
  const startId = id(start[0], start[1]);
  const goalId = id(goal[0], goal[1]);

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
          <span style={{ color: accent, fontSize: 22, marginLeft: 16, fontWeight: 700 }}>A* · {heuristic}</span>
        </h2>
      )}

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const cid = id(r, c);
          const isWall = wallSet.has(cid);
          const isStart = cid === startId;
          const isGoal = cid === goalId;
          const isCurrent = step.current === cid;
          const onPath = pathSet.has(cid);

          let bg = "#111827";
          let border = "#1f2937";
          let label = "";
          if (isWall) {
            bg = "#334155";
            border = "#475569";
          } else if (onPath) {
            bg = mix("#1e293b", accent, 0.6);
            border = accent;
          } else if (closedSet.has(cid)) {
            bg = mix("#1e293b", "#f59e0b", 0.28);
            border = "#b45309";
          } else if (openSet.has(cid)) {
            bg = mix("#1e293b", "#22d3ee", 0.3);
            border = "#0891b2";
          }
          if (isStart) {
            bg = mix("#1e293b", "#3b82f6", 0.6);
            border = "#3b82f6";
            label = "S";
          }
          if (isGoal) {
            bg = mix("#1e293b", "#22c55e", 0.55);
            border = "#22c55e";
            label = "G";
          }
          if (isCurrent && !isWall) {
            border = accent;
          }

          const gv = step.g[cid];
          const fv = step.f[cid];
          const showScores = !isWall && fv !== undefined && !isStart && !isGoal;

          return (
            <div
              key={cid}
              style={{
                position: "absolute",
                left: startX + c * size,
                top: startY + r * size,
                width: size - 4,
                height: size - 4,
                borderRadius: 8,
                background: bg,
                border: `${isCurrent ? 3 : 2}px solid ${border}`,
                boxShadow: isCurrent ? `0 0 16px ${accent}${Math.round(glow * 90).toString(16).padStart(2, "0")}` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f8fafc",
                fontWeight: 800,
                fontSize: label ? 30 : 26,
                boxSizing: "border-box",
              }}
            >
              {label}
              {showScores && (
                <>
                  <span style={{ position: "absolute", top: 4, left: 6, fontSize: 14, color: "#cbd5e1", fontWeight: 600 }}>g{gv}</span>
                  <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 15, color: "#f8fafc", fontWeight: 800 }}>f{fv}</span>
                </>
              )}
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
          color: step.kind === "path" ? "#22c55e" : step.kind === "no-path" ? "#ef4444" : accent,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
