import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateLRUSteps, LRUOperation } from "./LRUCache.steps";

export const LRUCacheSchema = z.object({
  title: z.string().optional(),
  capacity: z.number(),
  operations: z.array(
    z.union([
      z.object({ op: z.literal("get"), key: z.string() }),
      z.object({ op: z.literal("put"), key: z.string(), value: z.string() }),
    ]),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type LRUCacheProps = z.infer<typeof LRUCacheSchema>;

const CELL_W = 150;
const CELL_H = 96;
const GAP = 62;

export const LRUCache: React.FC<LRUCacheProps> = ({
  title,
  capacity,
  operations,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateLRUSteps(capacity, operations as LRUOperation[]),
    [capacity, operations],
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

  const miss = step.kind === "miss";
  const hit = step.kind === "hit";
  const evicting = step.kind === "evict";
  const stateColor = hit ? "#22c55e" : miss || evicting ? "#ef4444" : accent;

  const cells = step.entries;
  const totalW = cells.length * CELL_W + Math.max(0, cells.length - 1) * GAP;
  const startX = (videoWidth - totalW) / 2;
  const rowY = videoHeight / 2 - CELL_H / 2;
  const cellX = (i: number) => startX + i * (CELL_W + GAP);

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
          <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>
            capacity {step.capacity}
          </span>
        </h2>
      )}

      {/* MRU / LRU labels */}
      {cells.length > 0 && (
        <>
          <div style={{ position: "absolute", left: cellX(0), top: rowY - 44, width: CELL_W, textAlign: "center", color: "#22c55e", fontSize: 20, fontWeight: 800 }}>
            MRU
          </div>
          <div style={{ position: "absolute", left: cellX(cells.length - 1), top: rowY - 44, width: CELL_W, textAlign: "center", color: "#ef4444", fontSize: 20, fontWeight: 800 }}>
            LRU
          </div>
        </>
      )}

      {/* Arrows between nodes */}
      <svg width={videoWidth} height={videoHeight} style={{ position: "absolute", inset: 0 }}>
        {cells.map((_, i) => {
          if (i === cells.length - 1) return null;
          const x1 = cellX(i) + CELL_W;
          const x2 = cellX(i + 1);
          const y = rowY + CELL_H / 2;
          return (
            <line key={`a-${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke="#475569" strokeWidth={2.5} markerEnd="url(#lru-head)" />
          );
        })}
        <defs>
          <marker id="lru-head" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#475569" />
          </marker>
        </defs>
      </svg>

      {/* Cells */}
      {cells.map((e, i) => {
        const isActive = step.active === e.key;
        const border = isActive ? stateColor : "#475569";
        const bg = isActive ? mix("#1e293b", stateColor, 0.5 * glow) : "#1e293b";
        return (
          <div
            key={`n-${e.key}`}
            style={{
              position: "absolute",
              left: cellX(i),
              top: rowY,
              width: CELL_W,
              height: CELL_H,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: bg,
              border: `2px solid ${border}`,
              boxShadow: isActive ? `0 0 20px ${stateColor}70` : undefined,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 900, color: "#f1f5f9" }}>{e.key}</span>
            <span style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600 }}>{e.value}</span>
          </div>
        );
      })}

      {/* Evicted ghost */}
      {step.evicted && (
        <div
          style={{
            position: "absolute",
            left: cellX(cells.length),
            top: rowY,
            width: CELL_W,
            height: CELL_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            border: "2px dashed #ef4444",
            color: "#ef4444",
            fontSize: 28,
            fontWeight: 900,
            opacity: 1 - progress,
          }}
        >
          {step.evicted} ✕
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
          fontFamily: "monospace",
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
