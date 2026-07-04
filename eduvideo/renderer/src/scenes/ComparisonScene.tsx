import { Layout, Node as RNode, Rect, Txt } from "@revideo/2d";
import { ThreadGenerator, waitFor } from "@revideo/core";
import { Card } from "../components/Card";
import { DesignTokens } from "../styles/designSystem";
import { ComparisonProps, ComparisonSide } from "../types";

function side(tokens: DesignTokens, width: number, data: ComparisonSide, accent: string) {
  return Card(tokens, {
    width,
    padding: 0,
    gap: 0,
    clip: true,
    children: (
      <>
        {/* Coloured header band so each side is instantly distinguishable. */}
        <Rect
          layout
          width={width}
          fill={accent}
          paddingTop={tokens.spacing(2)}
          paddingBottom={tokens.spacing(2)}
          paddingLeft={tokens.spacing(3)}
          paddingRight={tokens.spacing(3)}
        >
          <Txt
            text={data.title}
            fontFamily={tokens.font.family}
            fontSize={tokens.font.sizeMD}
            fontWeight={tokens.font.weightBold}
            fill={tokens.colors.primaryText}
          />
        </Rect>
        <Layout
          layout
          direction={"column"}
          gap={tokens.spacing(2)}
          alignItems={"start"}
          padding={tokens.spacing(3.5)}
        >
          {data.points.map((point) => (
            <Layout layout direction={"row"} gap={tokens.spacing(1.5)} alignItems={"start"}>
              <Rect width={9} height={9} radius={5} fill={accent} marginTop={tokens.spacing(1.25)} />
              <Txt
                text={point}
                fontFamily={tokens.font.family}
                fontSize={tokens.font.sizeSM}
                fill={tokens.colors.text}
                width={width - tokens.spacing(9)}
                textWrap
              />
            </Layout>
          ))}
        </Layout>
      </>
    ),
  });
}

export function* ComparisonScene(
  container: RNode,
  tokens: DesignTokens,
  props: ComparisonProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped heading never
  // overlaps the cards — its rendered height pushes them down automatically.
  const columnWidth = width * 0.38;
  container.add(
    <Layout layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4)}>
      <Txt
        text={props.heading}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeLG}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.text}
        textAlign={"center"}
        width={width * 0.8}
        textWrap
      />
      <Layout layout direction={"row"} gap={tokens.spacing(3)} justifyContent={"center"} alignItems={"center"}>
        {side(tokens, columnWidth, props.left, tokens.colors.primary)}
        <Rect
          layout
          width={62}
          height={62}
          radius={31}
          fill={tokens.colors.surfaceAlt}
          stroke={tokens.colors.border}
          lineWidth={1.5}
          alignItems={"center"}
          justifyContent={"center"}
          shadowColor={tokens.elevation.color}
          shadowBlur={tokens.elevation.blur * 0.5}
          shadowOffsetY={tokens.elevation.offsetY * 0.5}
        >
          <Txt
            text={"VS"}
            fontFamily={tokens.font.family}
            fontSize={tokens.font.sizeSM * 0.72}
            fontWeight={tokens.font.weightBold}
            fill={tokens.colors.textMuted}
          />
        </Rect>
        {side(tokens, columnWidth, props.right, tokens.colors.accent)}
      </Layout>
    </Layout>,
  );
  yield* waitFor(duration);
}
