import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateTrieSteps, TrieOp } from "./TrieVisualizer.steps";

export const TrieVisualizerSchema = z.object({
  title: z.string().optional(),
  operations: z.array(
    z.object({
      op: z.enum(["insert", "search", "prefix"]),
      word: z.string(),
    }),
  ),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type TrieVisualizerProps = z.infer<typeof TrieVisualizerSchema>;

const NODE_R = 26;

export const TrieVisualizer: React.FC<TrieVisualizerProps> = ({
  title,
  operations,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const { layout, steps } = React.useMemo(
    () => generateTrieSteps(operations as TrieOp[]),
    [operations],
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

  const padX = 100;
  const topPad = 150;
  const areaW = videoWidth - padX * 2;
  const areaH = videoHeight - topPad - 130;

  const existing = new Set(step.existing);
  const endNodes = new Set(step.endNodes);
  const active = new Set(step.active);

  const posById = new Map(
    layout.map((n) => [n.id, { x: padX + n.x * areaW, y: topPad + n.y * areaH }]),
  );

  const hit = step.kind === "hit";
  const miss = step.kind === "miss";
  const stateColor = hit ? "#22c55e" : miss ? "#ef4444" : accent;

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
            padding: "0 100px",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        {/* Edges */}
        {layout.map((n) => {
          if (!n.parentId && n.parentId !== "") return null;
          if (n.id === "") return null;
          if (!existing.has(n.id)) return null;
          const p = posById.get(n.parentId as string);
          const c = posById.get(n.id);
          if (!p || !c) return null;
          const onPath = active.has(n.id);
          const mx = (p.x + c.x) / 2;
          const my = (p.y + c.y) / 2;
          return (
            <g key={`e-${n.id}`}>
              <line
                x1={p.x}
                y1={p.y}
                x2={c.x}
                y2={c.y}
                stroke={onPath ? stateColor : "#334155"}
                strokeWidth={onPath ? 4 : 2}
              />
              <text
                x={mx + 12}
                y={my}
                fill={onPath ? stateColor : "#64748b"}
                fontSize={18}
                fontWeight={700}
              >
                {n.char}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {layout.map((n) => {
          if (!existing.has(n.id)) return null;
          const c = posById.get(n.id);
          if (!c) return null;
          const isActive = active.has(n.id);
          const isEnd = endNodes.has(n.id);
          const justCreated = step.kind === "create" && isActive;
          const scale = justCreated
            ? interpolate(progress, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.back(1.6)),
              })
            : 1;
          const fill = isActive
            ? mix("#1e293b", stateColor, 0.55)
            : isEnd
              ? mix("#1e293b", accent, 0.3)
              : "#1e293b";
          const border = isActive ? stateColor : isEnd ? accent : "#475569";
          const isRoot = n.id === "";
          return (
            <g key={`n-${n.id}`} transform={`translate(${c.x}, ${c.y}) scale(${scale})`}>
              {isEnd && (
                <circle r={NODE_R + 6} fill="none" stroke={accent} strokeWidth={2} opacity={0.7} />
              )}
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={3}
                style={{ filter: isActive ? `drop-shadow(0 0 12px ${stateColor})` : undefined }}
              />
              <text
                textAnchor="middle"
                dy={isRoot ? 4 : 7}
                fill="#f1f5f9"
                fontSize={isRoot ? 26 : 22}
                fontWeight={800}
              >
                {n.char}
              </text>
            </g>
          );
        })}
      </svg>

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
