import { Layout, Node as RNode, Txt } from "@revideo/2d";
import { ThreadGenerator, waitFor } from "@revideo/core";
import { AccentBar } from "../components/decor";
import { DesignTokens } from "../styles/designSystem";
import { OutroProps } from "../types";

export function* OutroScene(
  container: RNode,
  tokens: DesignTokens,
  props: OutroProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  container.add(
    <Layout layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4)}>
      <Txt
        text={props.message}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeLG}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.text}
        textAlign={"center"}
        width={width * 0.7}
        textWrap
      />
      {AccentBar(tokens, 96)}
    </Layout>,
  );
  yield* waitFor(duration);
}
