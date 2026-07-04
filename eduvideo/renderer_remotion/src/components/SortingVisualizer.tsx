import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt, resolveSteps } from "./_shared/anim";
import { generateSortSteps } from "./SortingVisualizer.steps";

export const SortStepSchema = z.object({
  kind: z.enum(["compare", "swap", "set", "partition", "merge-write"]),
  indices: z.array(z.number()),
  writeValue: z.number().optional(),
  note: z.string().optional(),
});

export const SortingVisualizerSchema = z.object({
  title: z.string().optional(),
  algorithm: z.enum(["bubble", "merge", "quick", "heap", "radix", "counting"]),
  values: z.array(z.number()),
  steps: z.array(SortStepSchema).optional(),
  speed: z.number().optional(),
  showComparisonCounter: z.boolean().optional(),
  accentColor: z.string().optional(),
});

export type SortStep = z.infer<typeof SortStepSchema>;
export type SortingVisualizerProps = z.infer<typeof SortingVisualizerSchema>;

export const SortingVisualizer: React.FC<SortingVisualizerProps> = ({
  title,
  algorithm,
  values,
  steps: explicitSteps,
  speed = 1,
  showComparisonCounter,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const steps = resolveSteps(explicitSteps, () =>
    generateSortSteps(algorithm, values)
  );
  const stepFrames = Math.max(1, Math.round((1.2 / speed) * fps));
  const currentStepIdx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress, entering } = stepAt(currentStepIdx, { stepFrames, frame, fps });

  // Reduce steps [0..currentStepIdx-1] to get the "settled" array; the current
  // step animates on top of that.
  const settled = reduceSortUpTo(steps, currentStepIdx, values);
  const activeStep = steps[currentStepIdx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const maxV = Math.max(...values);
  const barW = 60;
  const gap = 12;
  const STAGGER_DELAY = 3; // frames between each bar entrance

  // Comparison counter (optional)
  const cmpCount = steps.slice(0, currentStepIdx + 1).filter(s => s.kind === "compare").length;
  const swapCount = steps.slice(0, currentStepIdx + 1).filter(s => s.kind === "swap").length;

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "60px 80px", boxSizing: "border-box", gap: 40,
      background: theme.background,
      fontFamily: `${theme.font}, sans-serif`,
      position: "relative",
    }}>
      {title && (
        <h2 style={{
          fontSize: 52, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <div style={{
        flex: 1, display: "flex", alignItems: "flex-end",
        justifyContent: "center", gap,
        position: "relative",
      }}>
        {settled.map((v, i) => {
          const involved = activeStep?.indices.includes(i);
          const isPivot =
            activeStep?.kind === "partition" && i === activeStep.indices[1];

          // Base color logic
          let color = "#1e293b";
          let border = "#334155";
          if (involved) {
            if (activeStep.kind === "compare") color = mix(color, accent, entering ? Math.min(1, progress / 0.3) : 1);
            if (activeStep.kind === "swap") color = mix(color, accent, 0.7);
            if (activeStep.kind === "set" || activeStep.kind === "merge-write")
              color = mix(color, accent, 0.8);
            if (isPivot) { color = theme.primary; border = theme.primary; }
          }

          // Swap animation: bars translate to swap partner's x
          let xOffset = 0;
          let yLift = 0;
          if (activeStep?.kind === "swap" && involved) {
            const [a, b] = activeStep.indices;
            const other = i === a ? b : a;
            const distance = (other - i) * (barW + gap);
            xOffset = interpolate(progress, [0, 1], [0, distance], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            });
            yLift = interpolate(progress, [0, 0.5, 1], [0, -20, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
          }

          // For `set` / `merge-write`, animate value change if this bar just wrote.
          let displayValue = v;
          if (
            (activeStep?.kind === "set" || activeStep?.kind === "merge-write") &&
            activeStep.indices[0] === i &&
            typeof activeStep.writeValue === "number"
          ) {
            const prev = i < settled.length ? settled[i] : 0;
            displayValue = interpolate(progress, [0, 1], [prev, activeStep.writeValue], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
          }

          const heightPct = (displayValue / maxV) * 100;

          // Staggered entrance: each bar scales up from 0 with a per-index delay
          const entranceStart = i * STAGGER_DELAY;
          const entranceEnd = entranceStart + 12;
          const entranceScale = interpolate(frame, [entranceStart, entranceEnd], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.5)),
          });

          return (
            <div key={i} style={{
              width: barW,
              height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center",
              translate: `${xOffset}px ${yLift}px`,
              scale: String(entranceScale),
              gap: 8,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", flexShrink: 0 }}>
                {Math.round(displayValue)}
              </span>
              {/* A percentage height on the bar below only resolves against a
                  parent with a DEFINITE height — this flex:1 track turns the
                  remaining space (after the number/index labels) into one, and
                  justifyContent:flex-end anchors the bar to the bottom so it
                  grows upward like a real bar chart. */}
              <div style={{
                flex: 1, width: "100%", minHeight: 0,
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
              }}>
                <div style={{
                  width: "100%", height: `${heightPct}%`,
                  minHeight: 4,
                  background: color,
                  border: `2px solid ${border}`,
                  borderRadius: "6px 6px 0 0",
                  boxShadow: involved ? `0 0 16px ${accent}70` : undefined,
                }} />
              </div>
              <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0 }}>{i}</span>
            </div>
          );
        })}
      </div>

      {showComparisonCounter && (
        <div style={{
          position: "absolute", top: 60, right: 80,
          display: "flex", gap: 24, color: "#f1f5f9", fontSize: 18,
        }}>
          <span>comparisons: <strong style={{ color: accent }}>{cmpCount}</strong></span>
          <span>swaps: <strong style={{ color: theme.primary }}>{swapCount}</strong></span>
        </div>
      )}
    </div>
  );
};

function reduceSortUpTo(
  steps: SortStep[], k: number, initial: number[]
): number[] {
  const arr = [...initial];
  for (let i = 0; i < k; i++) {
    const s = steps[i];
    if (s.kind === "swap") {
      const [a, b] = s.indices;
      [arr[a], arr[b]] = [arr[b], arr[a]];
    } else if (
      (s.kind === "set" || s.kind === "merge-write") &&
      typeof s.writeValue === "number"
    ) {
      arr[s.indices[0]] = s.writeValue;
    }
  }
  return arr;
}
