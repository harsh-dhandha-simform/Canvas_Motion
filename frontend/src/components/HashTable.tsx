import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateHashSteps, HashOp } from "./HashTable.steps";

export const HashTableSchema = z.object({
  title: z.string().optional(),
  buckets: z.number().optional(),
  strategy: z.enum(["chaining", "open-addressing"]).optional(),
  operations: z.array(
    z.object({
      op: z.enum(["insert", "lookup", "delete"]),
      key: z.string(),
      value: z.string().optional(),
    }),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type HashTableProps = z.infer<typeof HashTableSchema>;

export const HashTable: React.FC<HashTableProps> = ({
  title,
  buckets = 7,
  strategy = "chaining",
  operations,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = React.useMemo(
    () => generateHashSteps(strategy, buckets, operations as HashOp[]),
    [strategy, buckets, operations],
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

  const glow = interpolate(progress, [0, 0.5, 1], [0.4, 1, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const found = step.kind === "found";
  const miss = step.kind === "miss";
  const stateColor = found ? "#22c55e" : miss ? "#ef4444" : accent;

  const bucketColor = (b: number, occupied: boolean) => {
    if (step.activeBucket === b) return mix("#1e293b", stateColor, 0.5 * glow);
    return occupied ? "#1e293b" : "#0f172a";
  };
  const bucketBorder = (b: number, occupied: boolean) =>
    step.activeBucket === b ? stateColor : occupied ? "#475569" : "#1e293b";

  const pill = (
    label: string,
    highlighted: boolean,
    key: string,
  ) => (
    <div
      key={key}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 700,
        color: "#f1f5f9",
        background: highlighted ? mix("#1e293b", stateColor, 0.55) : "#1e293b",
        border: `2px solid ${highlighted ? stateColor : "#475569"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.background,
        fontFamily: `${theme.font}, sans-serif`,
        padding: "56px 90px 90px",
        boxSizing: "border-box",
        position: "relative",
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
            opacity: titleOpacity,
          }}
        >
          {title}
          <span style={{ color: accent, fontSize: 24, marginLeft: 16, fontWeight: 700 }}>
            {strategy}
          </span>
        </h2>
      )}

      {/* Hash function readout */}
      <div
        style={{
          marginTop: 20,
          alignSelf: "flex-start",
          padding: "12px 22px",
          borderRadius: 10,
          fontSize: 26,
          fontFamily: "monospace",
          color: step.hashCode != null ? stateColor : "#64748b",
          background: "#0f172a",
          border: `2px solid ${step.hashCode != null ? stateColor : "#1e293b"}`,
          minHeight: 30,
        }}
      >
        {step.hashCode != null && step.key != null
          ? `h("${step.key}") = ${step.hashCode} % ${step.buckets} = ${step.hashCode % step.buckets}`
          : " "}
      </div>

      {/* Buckets */}
      <div
        style={{
          flex: 1,
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {Array.from({ length: step.buckets }).map((_, b) => {
          const chain = step.chains[b] ?? [];
          const slot = step.slots[b] ?? null;
          const occupied = strategy === "chaining" ? chain.length > 0 : slot !== null;
          return (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#f1f5f9",
                  background: bucketColor(b, occupied),
                  border: `2px solid ${bucketBorder(b, occupied)}`,
                }}
              >
                {b}
              </div>
              <div style={{ color: "#475569", fontSize: 24 }}>→</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {strategy === "chaining"
                  ? chain.map((e, j) =>
                      pill(
                        e.value ? `${e.key}:${e.value}` : e.key,
                        step.activeBucket === b && step.activeInChain === j,
                        `${b}-${j}-${e.key}`,
                      ),
                    )
                  : slot
                    ? pill(
                        slot.value ? `${slot.key}:${slot.value}` : slot.key,
                        step.activeBucket === b,
                        `${b}-${slot.key}`,
                      )
                    : (
                        <span style={{ color: "#334155", fontSize: 18, fontStyle: "italic" }}>
                          empty
                        </span>
                      )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Caption */}
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
