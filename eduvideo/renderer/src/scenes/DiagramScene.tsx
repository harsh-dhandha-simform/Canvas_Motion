import { Node as RNode, Txt } from "@revideo/2d";
import { ThreadGenerator } from "@revideo/core";
import { renderDiagram } from "../diagram";
import { DesignTokens } from "../styles/designSystem";
import { DiagramProps } from "../types";

export function* DiagramScene(
  container: RNode,
  tokens: DesignTokens,
  props: DiagramProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  if (props.caption) {
    container.add(
      <Txt
        text={props.caption}
        y={height / 2 - 40}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.75}
        fill={tokens.colors.textMuted}
      />,
    );
  }
  yield* renderDiagram(container, tokens, props, width * 0.85, height * 0.75, duration);
}
