import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix, stepAt } from "./_shared/anim";
import { generateUnionFindSteps, UFOp } from "./UnionFind.steps";

export const UnionFindSchema = z.object({
  title: z.string().optional(),
  elements: z.array(z.union([z.string(), z.number()])),
  operations: z.array(
    z.union([
      z.object({ op: z.literal("union"), a: z.string(), b: z.string() }),
      z.object({ op: z.literal("find"), a: z.string() }),
    ]),
  ),
  byRank: z.boolean().optional(),
  pathCompression: z.boolean().optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type UnionFindProps = z.infer<typeof UnionFindSchema>;

const NODE_R = 34;

export const UnionFind: React.FC<UnionFindProps> = ({
  title,
  elements,
  operations,
  byRank = true,
  pathCompression = true,
  speed = 1,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const labels = React.useMemo(() => elements.map((e) => String(e)), [elements]);

  const steps = React.useMemo(
    () => generateUnionFindSteps(labels, operations as UFOp[], byRank, pathCompression),
    [labels, operations, byRank, pathCompression],
  );

  const stepFrames = Math.max(1, Math.round((1.0 / speed) * fps));
  const idx = Math.min(steps.length - 1, Math.floor(frame / stepFrames));
  const { progress } = stepAt(idx, { stepFrames, frame, fps });
  const step = steps[idx];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const n = labels.length;
  const padX = 110;
  const rowY = videoHeight * 0.62;
  const areaW = videoWidth - padX * 2;
  const posX = (i: number) => padX + ((i + 0.5) / n) * areaW;

  const active = new Set(step.active);
  const connected = step.kind === "connected";
  const stateColor = connected ? "#22c55e" : accent;

  // The arrow introduced/changed this step animates in; the rest are static.
  const changedChild =
    step.kind === "link" && step.link
      ? step.link[0]
      : step.kind === "compress"
        ? step.active[0]
        : -1;

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
            padding: "0 110px",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <svg width={videoWidth} height={videoHeight - 60} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="uf-head" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
          </marker>
          <marker id="uf-head-active" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={stateColor} />
          </marker>
        </defs>

        {/* Parent-pointer arrows (child → parent), arced above the row */}
        {step.parent.map((p, i) => {
          if (p === i) return null;
          const cx = posX(i);
          const px = posX(p);
          const arc = 70 + Math.abs(p - i) * 12;
          const midX = (cx + px) / 2;
          const isActiveArrow = changedChild === i;
          const draw = isActiveArrow
            ? interpolate(progress, [0, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              })
            : 1;
          const color = isActiveArrow || (active.has(i) && active.has(p)) ? stateColor : "#64748b";
          return (
            <path
              key={`arr-${i}`}
              d={`M ${cx} ${rowY - NODE_R} Q ${midX} ${rowY - NODE_R - arc} ${px} ${rowY - NODE_R}`}
              fill="none"
              stroke={color}
              strokeWidth={isActiveArrow ? 4 : 2.5}
              opacity={draw}
              markerEnd={color === stateColor ? "url(#uf-head-active)" : "url(#uf-head)"}
            />
          );
        })}

        {/* Element nodes at fixed positions */}
        {step.parent.map((p, i) => {
          const isRoot = p === i;
          const isActive = active.has(i);
          const fill = isActive ? mix("#1e293b", stateColor, 0.55) : "#1e293b";
          const border = isActive ? stateColor : isRoot ? accent : "#475569";
          return (
            <g key={`n-${i}`} transform={`translate(${posX(i)}, ${rowY})`}>
              {isRoot && (
                <circle r={NODE_R + 7} fill="none" stroke={accent} strokeWidth={2} opacity={0.6} />
              )}
              <circle
                r={NODE_R}
                fill={fill}
                stroke={border}
                strokeWidth={3}
                style={{ filter: isActive ? `drop-shadow(0 0 12px ${stateColor})` : undefined }}
              />
              <text textAnchor="middle" dy={8} fill="#f1f5f9" fontSize={24} fontWeight={800}>
                {labels[i]}
              </text>
              {isRoot && (
                <text textAnchor="middle" dy={NODE_R + 26} fill={accent} fontSize={15} fontWeight={700}>
                  root
                </text>
              )}
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
