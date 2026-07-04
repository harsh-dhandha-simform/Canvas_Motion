import React from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, Easing,
} from "remotion";
import { z } from "zod";
import { useTheme } from "../ThemeContext";
import { mix } from "./_shared/anim";
import { flattenTree } from "./RecursionTree.steps";

export type TreeNode = {
  label: string;
  children?: TreeNode[];
  returns?: string | number;
  pruned?: boolean;
};

const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() => z.object({
  label: z.string(),
  children: z.array(TreeNodeSchema).optional(),
  returns: z.union([z.string(), z.number()]).optional(),
  pruned: z.boolean().optional(),
}));

export const RecursionTreeSchema = z.object({
  title: z.string().optional(),
  root: TreeNodeSchema,
  pruning: z.boolean().optional(),
  showReturns: z.boolean().optional(),
  memoized: z.array(z.string()).optional(),
  speed: z.number().optional(),
  accentColor: z.string().optional(),
});

export type RecursionTreeProps = z.infer<typeof RecursionTreeSchema>;

export const RecursionTree: React.FC<RecursionTreeProps> = ({
  title, root, pruning, showReturns, memoized,
  speed = 1, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const theme = useTheme();
  const accent = accentColor ?? theme.accent;

  const flat = React.useMemo(() => flattenTree(root, memoized), [root, memoized]);

  const stepFrames = Math.max(1, Math.round((0.6 / speed) * fps));
  const growPhaseFrames = flat.length * stepFrames;
  const returnPhaseStart = growPhaseFrames + stepFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const nodeById = new Map(flat.map(n => [n.id, n]));

  // Convert percentage-based x/y to pixel values for SVG transforms
  const toPixelX = (pct: number) => (pct / 100) * videoWidth;
  const toPixelY = (pct: number) => (pct / 100) * videoHeight;

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: theme.background, fontFamily: `${theme.font}, sans-serif`,
      padding: "60px 80px", boxSizing: "border-box",
    }}>
      {title && (
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#f1f5f9",
          letterSpacing: "-0.03em", margin: 0, opacity: titleOpacity,
        }}>{title}</h2>
      )}

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* Edges (drawn before their child appears) */}
        {flat.map((n, i) => {
          if (!n.parentId) return null;
          const p = nodeById.get(n.parentId);
          if (!p) return null;
          const startAt = i * stepFrames;
          const edgeProgress = interpolate(
            frame, [startAt, startAt + Math.round(stepFrames * 0.4)], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic) }
          );
          const dimmed = pruning && n.pruned;

          // Use pixel values for SVG path coordinates
          const px = toPixelX(p.x);
          const py = toPixelY(p.y + 3);
          const nx = toPixelX(n.x);
          const ny = toPixelY(n.y);
          const midPx = toPixelX(p.x);
          const midPy = toPixelY((p.y + n.y) / 2);
          const endX = px + (nx - px) * edgeProgress;
          const endY = py + (ny - py) * edgeProgress;
          const pathD = `M ${px} ${py} Q ${midPx} ${midPy} ${endX} ${endY}`;

          return (
            <path
              key={n.id}
              d={pathD}
              stroke={dimmed ? "#334155" : "#64748b"}
              strokeWidth={2}
              fill="none"
              opacity={dimmed ? 0.3 : 1}
            />
          );
        })}

        {/* Nodes */}
        {flat.map((n, i) => {
          const startAt = i * stepFrames + Math.round(stepFrames * 0.4);
          const enter = interpolate(
            frame, [startAt, startAt + Math.round(stepFrames * 0.6)], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.4, 0.6, 1) }
          );
          const scale = interpolate(enter, [0, 1], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          let fill = "#1e293b";
          let border = "#334155";
          const isLeaf = !flat.some(x => x.parentId === n.id);
          if (pruning && n.pruned) { fill = mix("#1e293b", "#ef4444", 0.4); border = "#ef4444"; }
          else if (n.memoized) { fill = mix("#1e293b", theme.primary, 0.4); border = theme.primary; }
          else if (isLeaf && pruning && !n.pruned) { fill = mix("#1e293b", accent, 0.5); border = accent; }

          // Return-value overlay
          const showRet = showReturns && n.returns !== undefined && frame >= returnPhaseStart;
          const retIdx = flat.length - 1 - i;   // reverse order for post-order unwind
          const retStart = returnPhaseStart + retIdx * Math.round(stepFrames * 0.5);
          const retOpacity = showRet
            ? interpolate(frame, [retStart, retStart + Math.round(stepFrames * 0.4)], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              })
            : 0;

          // Pixel coordinates for the node center
          const nodeX = toPixelX(n.x);
          const nodeY = toPixelY(n.y);

          return (
            <g key={n.id} transform={`translate(${nodeX}, ${nodeY})`}>
              <rect
                x={-50 * scale} y={-20 * scale}
                width={100 * scale} height={40 * scale}
                rx={8}
                fill={fill} stroke={border} strokeWidth={2}
              />
              <text textAnchor="middle" dy={5} fill="#f1f5f9" fontSize={14 * scale} fontWeight={700}>
                {n.label}
              </text>
              {n.memoized && (
                <text textAnchor="middle" dy={38} fill={theme.primary} fontSize={11} fontWeight={700}>
                  ✓ memo
                </text>
              )}
              {retOpacity > 0 && (
                <text textAnchor="middle" dy={-28} fill={accent} fontSize={14} fontWeight={800} opacity={retOpacity}>
                  → {n.returns}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

