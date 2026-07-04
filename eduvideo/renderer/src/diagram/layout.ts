// Layout math for the Diagram Engine — pure functions, no rendering. Each layout
// takes the semantic nodes/edges (ids/labels, NOT coordinates) plus the available
// canvas area and returns concrete positions. Deterministic, no external
// graph-layout library (per phase guardrail: keep layout math simple).
import { DiagramEdge, DiagramNode } from "../types";

export interface BoxPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeGeometry {
  edge: DiagramEdge;
  from: { x: number; y: number };
  to: { x: number; y: number };
  labelPos: { x: number; y: number };
  order: number;
}

export interface LayoutResult {
  boxes: Record<string, BoxPosition>;
  edges: EdgeGeometry[];
  // groups get an extra boundary box drawn behind the nodes (architecture layout only)
  boundaries?: { label: string; box: BoxPosition }[];
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

/** Point where a ray from `box`'s center toward (towardX, towardY) exits its rectangle. */
function boxEdgePoint(box: BoxPosition, towardX: number, towardY: number): { x: number; y: number } {
  const dx = towardX - box.x;
  const dy = towardY - box.y;
  if (dx === 0 && dy === 0) return { x: box.x, y: box.y };
  const scale = Math.min(
    dx !== 0 ? box.width / 2 / Math.abs(dx) : Infinity,
    dy !== 0 ? box.height / 2 / Math.abs(dy) : Infinity,
  );
  return { x: box.x + dx * scale, y: box.y + dy * scale };
}

function clampCenterLine(nodeCount: number, spacing: number): number[] {
  const totalWidth = (nodeCount - 1) * spacing;
  const start = -totalWidth / 2;
  return Array.from({ length: nodeCount }, (_, i) => start + i * spacing);
}

/** Top-down layered layout: each node's layer = longest path from a root. */
export function layoutFlow(nodes: DiagramNode[], edges: DiagramEdge[], width: number, height: number): LayoutResult {
  const layerById = new Map<string, number>();
  const predecessors = new Map<string, string[]>();
  for (const n of nodes) predecessors.set(n.id, []);
  for (const e of edges) predecessors.get(e.to)?.push(e.from);

  // Iterative longest-path layering (bounded by node count to tolerate cycles).
  for (const n of nodes) layerById.set(n.id, 0);
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const n of nodes) {
      const preds = predecessors.get(n.id) ?? [];
      const maxPredLayer = preds.reduce((max, p) => Math.max(max, layerById.get(p) ?? 0), -1);
      if (maxPredLayer + 1 > (layerById.get(n.id) ?? 0)) layerById.set(n.id, maxPredLayer + 1);
    }
  }

  const layers = new Map<number, DiagramNode[]>();
  for (const n of nodes) {
    const layer = layerById.get(n.id) ?? 0;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(n);
  }

  const layerCount = Math.max(1, layers.size);
  const rowHeight = Math.min(180, height / layerCount);
  const boxes: Record<string, BoxPosition> = {};

  for (const [layer, layerNodes] of layers) {
    const xs = clampCenterLine(layerNodes.length, Math.min(280, width / layerNodes.length));
    const y = -height / 2 + rowHeight * layer + rowHeight / 2;
    layerNodes.forEach((n, i) => {
      boxes[n.id] = { x: xs[i], y, width: NODE_WIDTH, height: NODE_HEIGHT };
    });
  }

  const edgeGeometry = edges.map((e, order) => {
    const from = boxes[e.from];
    const to = boxes[e.to];
    if (!from || !to) return null;
    const fromPoint = { x: from.x, y: from.y + from.height / 2 };
    const toPoint = { x: to.x, y: to.y - to.height / 2 };
    return {
      edge: e,
      from: fromPoint,
      to: toPoint,
      labelPos: { x: (fromPoint.x + toPoint.x) / 2, y: (fromPoint.y + toPoint.y) / 2 },
      order,
    };
  });

  return { boxes, edges: edgeGeometry.filter((e): e is EdgeGeometry => e !== null) };
}

/** Vertical actor lifelines + ordered horizontal messages (edges array order = message order). */
export function layoutSequence(nodes: DiagramNode[], edges: DiagramEdge[], width: number, height: number): LayoutResult {
  const lifelineSpacing = Math.min(360, width / Math.max(nodes.length, 1));
  const xs = clampCenterLine(nodes.length, lifelineSpacing);
  const actorY = -height / 2 + NODE_HEIGHT / 2;
  const boxes: Record<string, BoxPosition> = {};
  nodes.forEach((n, i) => {
    boxes[n.id] = { x: xs[i], y: actorY, width: NODE_WIDTH, height: NODE_HEIGHT };
  });

  const messageAreaTop = actorY + NODE_HEIGHT / 2 + 40;
  const messageAreaBottom = height / 2 - 20;
  const rowHeight = edges.length > 0 ? (messageAreaBottom - messageAreaTop) / edges.length : 0;

  const edgeGeometry: EdgeGeometry[] = edges.map((e, i) => {
    const y = messageAreaTop + rowHeight * (i + 0.5);
    const fromX = boxes[e.from]?.x ?? 0;
    const toX = boxes[e.to]?.x ?? 0;
    return {
      edge: e,
      from: { x: fromX, y },
      to: { x: toX, y },
      labelPos: { x: (fromX + toX) / 2, y: y - 18 },
      order: i,
    };
  });

  return { boxes, edges: edgeGeometry };
}

/** Grouped components inside boundaries with connectors. Ungrouped nodes render directly. */
export function layoutArchitecture(nodes: DiagramNode[], edges: DiagramEdge[], width: number, height: number): LayoutResult {
  const groups = new Map<string, DiagramNode[]>();
  const ungrouped: DiagramNode[] = [];
  for (const n of nodes) {
    if (n.group) {
      if (!groups.has(n.group)) groups.set(n.group, []);
      groups.get(n.group)!.push(n);
    } else {
      ungrouped.push(n);
    }
  }

  const groupNames = [...groups.keys()];
  const columnCount = Math.max(groupNames.length + (ungrouped.length > 0 ? 1 : 0), 1);
  const columnWidth = width / columnCount;
  const boxes: Record<string, BoxPosition> = {};
  const boundaries: { label: string; box: BoxPosition }[] = [];

  groupNames.forEach((groupName, col) => {
    const members = groups.get(groupName)!;
    const columnX = -width / 2 + columnWidth * col + columnWidth / 2;
    const memberSpacing = NODE_HEIGHT + 30;
    const totalHeight = members.length * memberSpacing;
    const boundaryBox: BoxPosition = {
      x: columnX,
      y: 0,
      width: Math.min(columnWidth - 20, NODE_WIDTH + 60),
      height: Math.min(height - 40, totalHeight + 70),
    };
    boundaries.push({ label: groupName, box: boundaryBox });

    members.forEach((n, i) => {
      const y = -totalHeight / 2 + memberSpacing * i + memberSpacing / 2 + 20;
      boxes[n.id] = { x: columnX, y, width: NODE_WIDTH, height: NODE_HEIGHT };
    });
  });

  if (ungrouped.length > 0) {
    const col = groupNames.length;
    const columnX = -width / 2 + columnWidth * col + columnWidth / 2;
    const ys = clampCenterLine(ungrouped.length, NODE_HEIGHT + 30);
    ungrouped.forEach((n, i) => {
      boxes[n.id] = { x: columnX, y: ys[i], width: NODE_WIDTH, height: NODE_HEIGHT };
    });
  }

  const edgeGeometry: EdgeGeometry[] = edges
    .map((e, order) => {
      const from = boxes[e.from];
      const to = boxes[e.to];
      if (!from || !to) return null;
      return {
        edge: e,
        from: boxEdgePoint(from, to.x, to.y),
        to: boxEdgePoint(to, from.x, from.y),
        labelPos: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        order,
      };
    })
    .filter((e): e is EdgeGeometry => e !== null);

  return { boxes, edges: edgeGeometry, boundaries };
}
