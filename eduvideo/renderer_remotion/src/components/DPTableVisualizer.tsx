import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";

const CoordSchema = z.object({ row: z.number(), col: z.number() });

export const DPFillSchema = z.object({
  row: z.number(),
  col: z.number(),
  value: z.union([z.string(), z.number()]),
  dependsOn: z.array(CoordSchema).optional(),
  note: z.string().optional(),
});

export const DPTableVisualizerSchema = z.object({
  title: z.string().optional(),
  rows: z.number(),
  cols: z.number(),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  fills: z.array(DPFillSchema),
  highlightPath: z.array(CoordSchema).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type DPFill = z.infer<typeof DPFillSchema>;
export type DPTableVisualizerProps = z.infer<typeof DPTableVisualizerSchema>;

export const DPTableVisualizer: React.FC<DPTableVisualizerProps> = ({
  title, rows, cols, rowLabels, colLabels,
  fills, highlightPath = [],
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  if (fills.length === 0) {
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
            fontSize: 44, fontWeight: 900, color: "#f1f5f9",
            letterSpacing: "-0.03em", margin: 0,
          }}>{title}</h2>
        )}
      </div>
    );
  }

  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const gridDrawFrames = 12;
  const fillsStartFrame = gridDrawFrames + 6;
  const totalFillFrames = fills.length * stepFrames;
  const pathStartFrame = fillsStartFrame + totalFillFrames + stepFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Grid entrance
  const gridProgress = interpolate(frame, [0, gridDrawFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Which fills have started?
  const currentFillIdx = Math.max(-1, Math.min(fills.length - 1,
    Math.floor((frame - fillsStartFrame) / stepFrames)));
  const currentFillProgress = frame >= fillsStartFrame
    ? stepAt(currentFillIdx, { stepFrames, frame: frame - fillsStartFrame, fps }).progress
    : 0;

  // Path highlight sequencing
  const pathIdx = Math.max(-1, Math.min(highlightPath.length - 1,
    Math.floor((frame - pathStartFrame) / (stepFrames / 2))));

  const cellSize = Math.min(100, Math.floor(800 / Math.max(rows, cols)));
  const gap = 4;

  // Build a fast lookup of "was this cell filled at step k?" and its value.
  const cellState: Map<string, { value: string | number; filledAt: number }> = new Map();
  fills.forEach((f, i) => {
    if (i <= currentFillIdx) cellState.set(`${f.row},${f.col}`, { value: f.value, filledAt: i });
  });

  const current = currentFillIdx >= 0 ? fills[currentFillIdx] : undefined;
  const depSet = new Set((current?.dependsOn ?? []).map(d => `${d.row},${d.col}`));
  const pathSet = new Set(highlightPath.slice(0, pathIdx + 1).map(p => `${p.row},${p.col}`));

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 24,
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      position: "relative",
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {colLabels && (
            <div style={{ display: "flex", gap, marginLeft: rowLabels ? cellSize + gap : 0 }}>
              {colLabels.slice(0, cols).map((l, c) => (
                <div key={c} style={{
                  width: cellSize, textAlign: "center",
                  color: "#94a3b8", fontSize: 16, fontWeight: 700,
                }}>{l}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {rowLabels && (
              <div style={{ display: "flex", flexDirection: "column", gap }}>
                {rowLabels.slice(0, rows).map((l, r) => (
                  <div key={r} style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#94a3b8", fontSize: 16, fontWeight: 700,
                  }}>{l}</div>
                ))}
              </div>
            )}
            <div style={{ display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap,
              transformOrigin: "top left",
              scale: interpolate(gridProgress, [0, 1], [0.95, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
              opacity: gridProgress,
            }}>
              {Array.from({ length: rows * cols }, (_, idx) => {
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                const key = `${r},${c}`;
                const state = cellState.get(key);
                const isCurrent = current?.row === r && current?.col === c;
                const isDep = depSet.has(key);
                const inPath = pathSet.has(key);

                let bg = "#1e293b";
                let border = "#334155";
                if (state) bg = mix("#1e293b", theme.secondary, 0.35);
                if (isDep) { bg = mix(bg, theme.primary, 0.5); border = theme.primary; }
                if (isCurrent) {
                  const p = currentFillProgress;
                  bg = mix(bg, accent, Math.min(1, p * 2));
                  border = accent;
                }
                if (inPath) { bg = mix(bg, accent, 0.7); border = accent; }

                const scale = isCurrent
                  ? interpolate(currentFillProgress, [0, 1], [0.6, 1], {
                      extrapolateLeft: "clamp", extrapolateRight: "clamp",
                    })
                  : 1;

                const displayValue = state?.value ?? "";
                const showValue = state
                  ? isCurrent
                    ? interpolate(currentFillProgress, [0.4, 1], [0, 1], {
                        extrapolateLeft: "clamp", extrapolateRight: "clamp",
                      })
                    : 1
                  : 0;

                return (
                  <div key={key} style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: 6,
                    color: "#f1f5f9", fontSize: 22, fontWeight: 700,
                    scale,
                    boxShadow: isCurrent ? `0 0 20px ${accent}70` : undefined,
                  }}>
                    <span style={{ opacity: showValue }}>{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {current?.note && (
            <div style={{
              marginTop: 20, color: "#94a3b8", fontSize: 18,
              opacity: interpolate(currentFillProgress, [0, 0.3], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}>{current.note}</div>
          )}
        </div>
      </div>
    </div>
  );
};
