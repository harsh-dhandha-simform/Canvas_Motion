// Mirrors app/schemas/interactions.py DiagramExploreProps (which reuses the
// video_plan DiagramNode/DiagramEdge). Kept alongside the widget since types.ts
// models diagram_explore's props loosely as Record<string, unknown>.
export interface DiagramNode {
  id: string;
  label: string;
  type?: string;
  group?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  direction?: string;
}

export interface DiagramExploreProps {
  diagramType: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  labels?: string[];
  caption?: string;
}
