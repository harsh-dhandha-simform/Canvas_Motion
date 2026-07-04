import { Node as RNode } from "@revideo/2d";
import { ThreadGenerator } from "@revideo/core";
import { renderCode } from "../code";
import { DesignTokens } from "../styles/designSystem";
import { CodeProps } from "../types";

export function* CodeScene(
  container: RNode,
  tokens: DesignTokens,
  props: CodeProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  yield* renderCode(container, tokens, props, width * 0.75, height * 0.7, duration);
}
