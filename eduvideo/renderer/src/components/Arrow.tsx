// A directional connector between two points, used by the Diagram Engine's edges.
// Thin wrapper over Revideo's built-in Line arrow support so every diagram edge
// gets consistent styling from the design system.
import { Line } from "@revideo/2d";
import { PossibleVector2 } from "@revideo/core";
import { DesignTokens } from "../styles/designSystem";

export interface ArrowOptions {
  from: PossibleVector2;
  to: PossibleVector2;
  label?: string;
  bidirectional?: boolean;
}

export function Arrow(tokens: DesignTokens, opts: ArrowOptions) {
  return (
    <Line
      points={[opts.from, opts.to]}
      stroke={tokens.colors.diagramEdge}
      lineWidth={3}
      endArrow
      startArrow={opts.bidirectional ?? false}
      arrowSize={12}
    />
  );
}
