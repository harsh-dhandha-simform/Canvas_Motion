import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const TreeHierarchySchema = z.object({
  title: z.string().optional(),
  /** Root node. */
  root: z.object({
    label: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    children: z.array(
      z.object({
        label: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
        children: z.array(
          z.object({
            label: z.string(),
            description: z.string().optional(),
            color: z.string().optional(),
          })
        ),
      })
    ),
  }),
  accentColor: z.string().optional(),
  direction: z.enum(["down", "right"]).optional(),
});

export type TreeHierarchyProps = z.infer<typeof TreeHierarchySchema>;

type FlatNode = {
  id: string;
  label: string;
  description?: string;
  color?: string;
  depth: number;
  // Position is filled in during layout pass
  x: number;
  y: number;
  parentId?: string;
  childrenIds: string[];
};

const CHILD_GAP_X = 200; // horizontal spacing between siblings
const CHILD_GAP_Y = 140; // vertical spacing between depth levels
const NODE_W = 170;
const NODE_H = 70;

/**
 * Walk the tree, assign x positions so siblings don't overlap.
 * Use a leaf-counting layout: subtree width = sum of leaf widths.
 */
function flatten(root: TreeHierarchyProps["root"]): FlatNode[] {
  const nodes: FlatNode[] = [];
  let nextId = 0;

  const walk = (
    node: {
      label: string;
      description?: string;
      color?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children?: any[];
    },
    depth: number,
    parentId?: string
  ): string => {
    const id = `n${nextId++}`;
    nodes.push({
      id,
      label: node.label,
      description: node.description,
      color: node.color,
      depth,
      x: 0,
      y: 0,
      parentId,
      childrenIds: [],
    });
    const children = node.children || [];
    children.forEach((c) => {
      const cid = walk(c, depth + 1, id);
      const nodeRef = nodes.find((n) => n.id === id)!;
      nodeRef.childrenIds.push(cid);
    });
    return id;
  };

  walk(root, 0);

  // Layout: assign x positions so subtrees don't overlap
  // Compute subtree width (in node units) recursively.
  const subtreeWidth = new Map<string, number>();
  const computeWidth = (id: string): number => {
    const n = nodes.find((x) => x.id === id)!;
    if (n.childrenIds.length === 0) {
      subtreeWidth.set(id, 1);
      return 1;
    }
    const w = n.childrenIds.reduce((acc, c) => acc + computeWidth(c), 0);
    subtreeWidth.set(id, Math.max(1, w));
    return subtreeWidth.get(id)!;
  };

  computeWidth(nodes[0].id);

  // Place nodes left-to-right
  const assignX = (id: string, leftEdge: number) => {
    const w = subtreeWidth.get(id)!;
    const n = nodes.find((x) => x.id === id)!;
    n.x = leftEdge + (w * CHILD_GAP_X) / 2;
    n.y = n.depth * CHILD_GAP_Y + 60;
    let cursor = leftEdge;
    n.childrenIds.forEach((cid) => {
      assignX(cid, cursor);
      cursor += subtreeWidth.get(cid)! * CHILD_GAP_X;
    });
  };
  assignX(nodes[0].id, 80);

  return nodes;
}

export const TreeHierarchy: React.FC<TreeHierarchyProps> = ({
  title,
  root,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nodes = flatten(root);

  // Compute total bounds for SVG viewBox
  const minX = Math.min(...nodes.map((n) => n.x)) - 120;
  const maxX = Math.max(...nodes.map((n) => n.x)) + 120;
  const minY = Math.min(...nodes.map((n) => n.y)) - 60;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 80;
  const vbW = Math.max(1920, maxX - minX);
  const vbH = Math.max(1080, maxY - minY);

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // BFS-order stagger so parents appear before children
  const orderedByDepth = [...nodes].sort((a, b) => a.depth - b.depth);
  const springs = new Map<string, number>();
  let cursor = 15;
  orderedByDepth.forEach((n) => {
    springs.set(
      n.id,
      spring({
        frame: frame - cursor,
        fps,
        config: { damping: 14, stiffness: 140 },
        durationInFrames: 30,
      })
    );
    cursor += 7;
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "40px 60px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 8,
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <filter id="tree-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {nodes.map((n) =>
            n.childrenIds.map((cid) => {
              const child = nodes.find((x) => x.id === cid)!;
              const sp = Math.min(springs.get(n.id)!, springs.get(cid)!);
              const x1 = n.x;
              const y1 = n.y + NODE_H / 2;
              const x2 = child.x;
              const y2 = child.y - NODE_H / 2;
              const midY = (y1 + y2) / 2;
              const pathLen = Math.abs(y2 - y1) + Math.abs(x2 - x1) + 100;
              return (
                <path
                  key={`e-${cid}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={2}
                  opacity={sp * 0.7}
                  strokeDasharray={pathLen}
                  strokeDashoffset={pathLen * (1 - sp)}
                />
              );
            })
          )}

          {/* Nodes */}
          {nodes.map((n) => {
            const sp = springs.get(n.id)!;
            const opacity = sp;
            const scale = interpolate(sp, [0, 1], [0.85, 1]);
            const color = n.color || accentColor;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y}) scale(${scale})`}
                style={{
                  opacity,
                  transformOrigin: `${n.x}px ${n.y}px`,
                }}
              >
                <rect
                  x={-NODE_W / 2}
                  y={-NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill="#0f1729"
                  stroke={color}
                  strokeWidth={2.5}
                  style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
                />
                <text
                  x={0}
                  y={n.description ? -4 : 6}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize={16}
                  fontWeight={800}
                  fontFamily="Inter, sans-serif"
                >
                  {n.label}
                </text>
                {n.description && (
                  <text
                    x={0}
                    y={16}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={11}
                    fontFamily="Fira Code, monospace"
                  >
                    {n.description}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};