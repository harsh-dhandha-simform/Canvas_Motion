import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { usePanelSize } from "../PanelSizeContext";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateFenwickSteps, FenwickOperation } from "./FenwickTree.steps";

export const FenwickTreeSchema = z.object({
  title: z.string().optional(),
  values: z.array(z.number()),
  operations: z.array(
    z.union([
      z.object({ op: z.literal("update"), index: z.number(), delta: z.number() }),
      z.object({ op: z.literal("prefixSum"), index: z.number() }),
    ]),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type FenwickTreeProps = z.infer<typeof FenwickTreeSchema>;

const CELL = 62;
const GAP = 10;

export const FenwickTree: React.FC<FenwickTreeProps> = ({
  title,
  values,
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
    () => generateFenwickSteps(values, operations as FenwickOperation[]),
    [values, operations],
  );

  const stepFrames = Math.max(1, Math.round((1.1 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const n = values.length;
  const rowW = n * CELL + (n - 1) * GAP;
  const startX = (videoWidth - rowW) / 2;
  const cellX = (oneBased: number) => startX + (oneBased - 1) * (CELL + GAP);

  const arrRowY = 340;
  const bitRowY = 620;

  const draw = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const isQuery = step.kind === "query" || step.kind === "query-done";
  const stateColor = isQuery ? "#22c55e" : accent;

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
        </h2>
      )}

      {step.sum != null && (
        <div
          style={{
            position: "absolute",
            top: 62,
            right: 90,
            fontSize: 30,
            fontWeight: 800,
            fontFamily: "monospace",
            color: "#22c55e",
          }}
        >
          sum = {step.sum}
        </div>
      )}

      {/* Row labels */}
      <div style={{ position: "absolute", left: 90, top: arrRowY + CELL / 2 - 14, color: "#94a3b8", fontSize: 22, fontWeight: 700 }}>
        array
      </div>
      <div style={{ position: "absolute", left: 90, top: bitRowY + CELL / 2 - 14, color: "#94a3b8", fontSize: 22, fontWeight: 700 }}>
        BIT
      </div>

      <svg width={videoWidth} height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* Jump arc between consecutive BIT indices */}
        {step.active != null && step.jumpFrom != null && (
          (() => {
            const x1 = cellX(step.jumpFrom) + CELL / 2;
            const x2 = cellX(step.active) + CELL / 2;
            const y = bitRowY - 6;
            const arc = 60 + Math.abs(step.active - step.jumpFrom) * 6;
            return (
              <path
                d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - arc} ${x2} ${y}`}
                fill="none"
                stroke={stateColor}
                strokeWidth={3}
                opacity={draw}
                markerEnd="url(#fen-head)"
              />
            );
          })()
        )}
        <defs>
          <marker id="fen-head" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={stateColor} />
          </marker>
        </defs>
      </svg>

      {/* Array row (0-indexed) */}
      {step.arr.map((v, i) => (
        <div
          key={`a-${i}`}
          style={{
            position: "absolute",
            left: cellX(i + 1),
            top: arrRowY,
            width: CELL,
            height: CELL,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: "#1e293b",
            border: "2px solid #475569",
            color: "#f1f5f9",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {v}
          <span style={{ position: "absolute", bottom: -26, fontSize: 14, color: "#64748b", fontWeight: 600 }}>
            {i}
          </span>
        </div>
      ))}

      {/* BIT row (1-indexed) */}
      {step.tree.slice(1).map((v, i) => {
        const oneBased = i + 1;
        const isActive = step.active === oneBased;
        return (
          <div
            key={`b-${oneBased}`}
            style={{
              position: "absolute",
              left: cellX(oneBased),
              top: bitRowY,
              width: CELL,
              height: CELL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: isActive ? mix("#1e293b", stateColor, 0.55) : "#1e293b",
              border: `2px solid ${isActive ? stateColor : "#475569"}`,
              color: "#f1f5f9",
              fontSize: 24,
              fontWeight: 800,
              boxShadow: isActive ? `0 0 16px ${stateColor}80` : undefined,
            }}
          >
            {v}
            <span style={{ position: "absolute", bottom: -26, fontSize: 14, color: "#64748b", fontWeight: 600 }}>
              {oneBased}
            </span>
          </div>
        );
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
          color: stateColor,
        }}
      >
        {step.caption}
      </div>
    </div>
  );
};
