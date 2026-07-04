import { Layout, Node as RNode, Txt } from "@revideo/2d";
import { ThreadGenerator, waitFor } from "@revideo/core";
import { AccentBar } from "../components/decor";
import { DesignTokens } from "../styles/designSystem";
import { TitleProps } from "../types";

export function* TitleScene(
  container: RNode,
  tokens: DesignTokens,
  props: TitleProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped title never overlaps
  // the subtitle — its rendered height pushes the subtitle down automatically.
  // A gradient accent bar above the title anchors it and adds colour.
  container.add(
    <Layout layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4)}>
      {AccentBar(tokens, 120)}
      <Txt
        text={props.title}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeXL}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.text}
        textAlign={"center"}
        width={width * 0.82}
        textWrap
        lineHeight={tokens.font.sizeXL * 1.12}
      />
      {props.subtitle && (
        <Txt
          text={props.subtitle}
          fontFamily={tokens.font.family}
          fontSize={tokens.font.sizeMD}
          fill={tokens.colors.textMuted}
          textAlign={"center"}
          width={width * 0.68}
          textWrap
        />
      )}
    </Layout>,
  );
  yield* waitFor(duration);
}
