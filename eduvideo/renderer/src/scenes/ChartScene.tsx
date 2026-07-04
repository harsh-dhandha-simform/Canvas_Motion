import { Node as RNode } from "@revideo/2d";
import { ThreadGenerator } from "@revideo/core";
import { renderChart } from "../charts";
import { DesignTokens } from "../styles/designSystem";
import { ChartProps } from "../types";

export function* ChartScene(
  container: RNode,
  tokens: DesignTokens,
  props: ChartProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  yield* renderChart(container, tokens, props, width * 0.8, height * 0.75, duration);
}
