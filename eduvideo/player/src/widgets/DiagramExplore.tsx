// diagram_explore — a lightweight, player-side render of the concept's diagram.
// Nodes are laid out on a simple grid; edges are SVG arrows. Click a node to focus
// it (dim the rest, highlight its incident edges). Not the full renderer diagram
// engine — a minimal interactive version, which is all the panel needs.
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { DiagramExploreProps } from "./diagramTypes";

const W = 380;
const NODE_W = 116;
const NODE_H = 52;

export function DiagramExplore({ props }: { props: DiagramExploreProps }) {
  const nodes = props.nodes ?? [];
  const edges = props.edges ?? [];
  const [focus, setFocus] = useState<string | null>(null);

  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const cellW = W / cols;
  const cellH = 96;
  const H = rows * cellH + 24;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    pos.set(n.id, { x: c * cellW + cellW / 2, y: r * cellH + cellH / 2 + 12 });
  });

  const incident = (from: string, to: string) => focus === null || focus === from || focus === to;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(1.5) }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={t.colors.textMuted} />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const on = incident(e.from, e.to);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={on ? t.colors.primary : t.colors.border}
              strokeWidth={2}
              opacity={on ? 1 : 0.3}
              markerEnd="url(#arrow)"
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const active = focus === n.id;
          const dim = focus !== null && !active;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
              onClick={() => setFocus((f) => (f === n.id ? null : n.id))}
              style={{ cursor: "pointer", opacity: dim ? 0.4 : 1 }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={active ? t.colors.primary : t.colors.surface}
                stroke={active ? t.colors.primary : t.colors.border}
                strokeWidth={1.5}
              />
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={active ? t.colors.primaryText : t.colors.text}
              >
                {n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ color: t.colors.textMuted, fontSize: 13 }}>
        {focus ? nodes.find((n) => n.id === focus)?.label : props.caption || "Tap a node to focus it."}
      </div>
    </div>
  );
}
