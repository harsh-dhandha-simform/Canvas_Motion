import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateSkipListSteps, SkipOperation } from "./SkipList.steps";

export const SkipListSchema = z.object({
  title: z.string().optional(),
  operations: z.array(
    z.union([
      z.object({ op: z.literal("insert"), value: z.number(), level: z.number().optional() }),
      z.object({ op: z.literal("search"), value: z.number() }),
    ]),
  ),
  maxLevel: z.number().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type SkipListProps = z.infer<typeof SkipListSchema>;

const CELL_W = 76;
const CELL_H = 52;
const ROW_GAP = 16;
const COL_GAP = 20;

export const SkipList: React.FC<SkipListProps> = ({
  title,
  operations,
  maxLevel = 4,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = usePanelSize();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateSkipListSteps(operations as SkipOperation[], maxLevel),
    [operations, maxLevel],
  );

  const stepFrames = Math.max(1, Math.round((0.85 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Columns: HEAD (col 0) then each node. Rows: level maxLevel-1 (top) .. 0 (bottom).
  const cols = step.nodes.length + 1;
  const gridW = cols * CELL_W + (cols - 1) * COL_GAP;
  const startX = (videoWidth - gridW) / 2;
  const gridH = maxLevel * CELL_H + (maxLevel - 1) * ROW_GAP;
  const startY = (videoHeight - gridH) / 2 + 30;

  const colX = (col: number) => startX + col * (CELL_W + COL_GAP);
  const rowY = (level: number) => startY + (maxLevel - 1 - level) * (CELL_H + ROW_GAP);

  const found = step.kind === "found";
  const miss = step.kind === "miss";
  const stateColor = found ? "#22c55e" : miss ? "#ef4444" : accent;

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // present cells per level → for drawing horizontal links
  const cellPresent = (col: number, level: number) => {
    if (col === 0) return true; // HEAD spans all levels
    return step.nodes[col - 1].height > level;
  };

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
          {step.target != null && (
            <span style={{ color: stateColor, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>
              target {step.target}
            </span>
          )}
        </h2>
      )}

      {/* Horizontal express-lane links */}
      <svg width={videoWidth} height={videoHeight} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: maxLevel }).map((_, level) =>
          Array.from({ length: cols }).map((__, col) => {
            if (!cellPresent(col, level)) return null;
            // find next present column at this level
            let nxt = col + 1;
            while (nxt < cols && !cellPresent(nxt, level)) nxt++;
            if (nxt >= cols) return null;
            const y = rowY(level) + CELL_H / 2;
            return (
              <line
                key={`lnk-${level}-${col}`}
                x1={colX(col) + CELL_W}
                y1={y}
                x2={colX(nxt)}
                y2={y}
                stroke="#334155"
                strokeWidth={2}
                markerEnd="url(#sl-head)"
              />
            );
          }),
        )}
        <defs>
          <marker id="sl-head" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="#475569" />
          </marker>
        </defs>
      </svg>

      {/* Cells */}
      {Array.from({ length: maxLevel }).map((_, level) =>
        Array.from({ length: cols }).map((__, col) => {
          if (!cellPresent(col, level)) return null;
          const isHead = col === 0;
          const isActive = step.activeIndex === col - 1 && step.activeLevel === level && !isHead
            ? true
            : isHead && step.activeIndex === -1 && step.activeLevel === level;
          const isFoundCol = step.foundIndex != null && col - 1 === step.foundIndex;
          const label = isHead ? "H" : String(step.nodes[col - 1].value);
          const border = isActive ? stateColor : isFoundCol ? "#22c55e" : "#475569";
          const bg = isActive
            ? mix("#1e293b", stateColor, 0.55 * glow)
            : isFoundCol
              ? mix("#1e293b", "#22c55e", 0.4)
              : isHead
                ? "#0b1220"
                : "#1e293b";
          return (
            <div
              key={`c-${level}-${col}`}
              style={{
                position: "absolute",
                left: colX(col),
                top: rowY(level),
                width: CELL_W,
                height: CELL_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: bg,
                border: `2px solid ${border}`,
                color: "#f1f5f9",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: isActive ? `0 0 16px ${stateColor}80` : undefined,
              }}
            >
              {level === 0 ? label : isHead ? "H" : ""}
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
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
