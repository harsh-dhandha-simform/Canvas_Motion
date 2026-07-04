// The Diagram Engine (Phase 9 core deliverable). Renders a DiagramScene from
// semantic nodes/edges — never coordinates chosen by the LLM. Picks a layout module
// per `diagramType`, then reveals nodes/edges progressively so the diagram "builds
// up" in sync with narration, matching MASTER_CONTEXT.md §5.1.
import { Line, Node as RNode, Rect, Txt } from "@revideo/2d";
import { all, createRef, sequence, ThreadGenerator, waitFor } from "@revideo/core";
import { Boundary } from "../components/Boundary";
import { DesignTokens } from "../styles/designSystem";
import { DiagramNode, DiagramProps, DiagramType } from "../types";
import { layoutArchitecture, layoutFlow, layoutSequence, LayoutResult } from "./layout";

type LayoutFn = (nodes: DiagramNode[], edges: DiagramProps["edges"], w: number, h: number) => LayoutResult;

const LAYOUTS: Record<DiagramType, LayoutFn> = {
  flow: layoutFlow,
  sequence: layoutSequence,
  architecture: layoutArchitecture,
  // TODO(Phase 9): dedicated layouts not built yet; fall back to `flow` for now.
  state: layoutFlow,
  tree: layoutFlow,
  graph: layoutFlow,
  stack: layoutFlow,
  timeline: layoutFlow,
};

function nodeIcon(type?: string): string {
  switch (type) {
    case "actor":
      return "\u{1F9CD} ";
    case "db":
      return "\u{1F5C4}\u{FE0F} ";
    case "queue":
      return "\u{1F4E5} ";
    case "service":
      return "\u{2699}\u{FE0F} ";
    default:
      return "";
  }
}

export function* renderDiagram(
  container: RNode,
  tokens: DesignTokens,
  props: DiagramProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  const layoutFn = LAYOUTS[props.diagramType] ?? layoutFlow;
  const result = layoutFn(props.nodes, props.edges, width, height);

  const revealTasks: ThreadGenerator[] = [];

  if (result.boundaries) {
    for (const b of result.boundaries) {
      const ref = createRef<Rect>();
      container.add(
        Boundary(tokens, b.label, {
          ref,
          position: [b.box.x, b.box.y],
          width: b.box.width,
          height: b.box.height,
          opacity: 0,
        }),
      );
      revealTasks.push(ref().opacity(1, 0.3));
    }
  }

  const nodesById = new Map(props.nodes.map((n) => [n.id, n]));
  for (const id of Object.keys(result.boxes)) {
    const n = nodesById.get(id);
    if (!n) continue;
    const box = result.boxes[id];
    const ref = createRef<Rect>();
    container.add(
      <Rect
        ref={ref}
        position={[box.x, box.y]}
        width={box.width}
        height={box.height}
        fill={tokens.colors.diagramNode}
        stroke={tokens.colors.diagramEdge}
        lineWidth={2}
        radius={tokens.radius.sm}
        opacity={0}
        scale={0.85}
      >
        <Txt
          text={`${nodeIcon(n.type)}${n.label}`}
          fontFamily={tokens.font.family}
          fontSize={tokens.font.sizeSM}
          fontWeight={tokens.font.weightBold}
          fill={tokens.colors.diagramNodeText}
          width={box.width - 24}
          textWrap
          textAlign={"center"}
        />
      </Rect>,
    );
    revealTasks.push(all(ref().opacity(1, 0.3), ref().scale(1, 0.3)));
  }

  for (const eg of result.edges) {
    const lineRef = createRef<Line>();
    container.add(
      <Line
        ref={lineRef}
        points={[
          [eg.from.x, eg.from.y],
          [eg.to.x, eg.to.y],
        ]}
        stroke={tokens.colors.diagramEdge}
        lineWidth={3}
        endArrow
        arrowSize={12}
        opacity={0}
      />,
    );
    if (eg.edge.label) {
      const labelRef = createRef<Txt>();
      const prefix = props.diagramType === "sequence" ? `${eg.order + 1}. ` : "";
      container.add(
        <Txt
          ref={labelRef}
          position={[eg.labelPos.x, eg.labelPos.y]}
          text={`${prefix}${eg.edge.label}`}
          fontFamily={tokens.font.family}
          fontSize={tokens.font.sizeSM * 0.72}
          fontWeight={tokens.font.weightBold}
          fill={tokens.colors.text}
          opacity={0}
        />,
      );
      revealTasks.push(all(lineRef().opacity(1, 0.3), labelRef().opacity(1, 0.3)));
    } else {
      revealTasks.push(lineRef().opacity(1, 0.3));
    }
  }

  const revealBudget = Math.min(duration * 0.7, Math.max(revealTasks.length - 1, 0) * 0.35 + 0.3);
  const stepDelay = revealTasks.length > 1 ? (revealBudget - 0.3) / (revealTasks.length - 1) : 0;
  const totalRevealTime = stepDelay * Math.max(revealTasks.length - 1, 0) + 0.3;

  yield* sequence(Math.max(stepDelay, 0), ...revealTasks);

  const remaining = duration - totalRevealTime;
  if (remaining > 0) yield* waitFor(remaining);
}
