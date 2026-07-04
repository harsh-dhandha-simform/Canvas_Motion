import { Layout, Node as RNode, Txt } from "@revideo/2d";
import { ThreadGenerator, waitFor } from "@revideo/core";
import { Card } from "../components/Card";
import { Eyebrow } from "../components/decor";
import { KeywordBadge } from "../components/KeywordBadge";
import { DesignTokens } from "../styles/designSystem";
import { DefinitionProps } from "../types";

export function* DefinitionScene(
  container: RNode,
  tokens: DesignTokens,
  props: DefinitionProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped term never overlaps
  // the definition card — its rendered height pushes the rest down automatically.
  container.add(
    <Layout layout direction={"column"} alignItems={"center"} gap={tokens.spacing(3)}>
      {Eyebrow(tokens, "Definition")}
      <Txt
        text={props.term}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeLG}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.primary}
        textAlign={"center"}
        width={width * 0.8}
        textWrap
      />
      {Card(tokens, {
        width: width * 0.7,
        children: (
          <Txt
            text={props.definition}
            fontFamily={tokens.font.family}
            fontSize={tokens.font.sizeMD}
            fill={tokens.colors.text}
            width={width * 0.6}
            textWrap
            textAlign={"center"}
          />
        ),
      })}
      {props.keywords.length > 0 && (
        <Layout layout direction={"row"} gap={tokens.spacing(2)} justifyContent={"center"}>
          {props.keywords.map((kw) => KeywordBadge(tokens, kw))}
        </Layout>
      )}
    </Layout>,
  );
  yield* waitFor(duration);
}
