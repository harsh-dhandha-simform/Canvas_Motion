import { Layout, Node as RNode, Rect, Txt } from "@revideo/2d";
import { createRef, sequence, ThreadGenerator, waitFor } from "@revideo/core";
import { Eyebrow } from "../components/decor";
import { DesignTokens } from "../styles/designSystem";
import { RecapProps } from "../types";

export function* RecapScene(
  container: RNode,
  tokens: DesignTokens,
  props: RecapProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped heading never
  // overlaps the points — its rendered height pushes them down automatically.
  const outerRef = createRef<Layout>();
  container.add(
    <Layout ref={outerRef} layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4)}>
      {Eyebrow(tokens, "Recap")}
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
    </Layout>,
  );

  const cardWidth = width * 0.62;
  const itemRefs = props.points.map(() => createRef<Rect>());
  outerRef().add(
    <Layout layout direction={"column"} gap={tokens.spacing(2.5)} alignItems={"stretch"}>
      {props.points.map((point, i) => (
        <Rect
          ref={itemRefs[i]}
          layout
          direction={"row"}
          gap={tokens.spacing(2.5)}
          alignItems={"center"}
          width={cardWidth}
          fill={tokens.colors.surface}
          stroke={tokens.colors.border}
          lineWidth={1.5}
          radius={tokens.radius.md}
          padding={tokens.spacing(2.5)}
          shadowColor={tokens.elevation.color}
          shadowBlur={tokens.elevation.blur * 0.5}
          shadowOffsetY={tokens.elevation.offsetY * 0.5}
          opacity={0}
        >
          <Rect
            layout
            width={40}
            height={40}
            radius={20}
            fill={tokens.colors.correct}
            alignItems={"center"}
            justifyContent={"center"}
          >
            <Txt text={"✓"} fontFamily={tokens.font.family} fontSize={tokens.font.sizeSM * 0.85} fontWeight={tokens.font.weightBold} fill={tokens.colors.primaryText} />
          </Rect>
          <Txt text={point} fontFamily={tokens.font.family} fontSize={tokens.font.sizeMD} fill={tokens.colors.text} width={cardWidth - tokens.spacing(11)} textWrap />
        </Rect>
      ))}
    </Layout>,
  );

  const revealStep = Math.min(0.4, Math.max(duration * 0.5, 0.2) / Math.max(props.points.length, 1));
  yield* sequence(revealStep, ...itemRefs.map((ref) => ref().opacity(1, 0.3)));
  const revealTime = revealStep * Math.max(props.points.length - 1, 0) + 0.3;
  const remaining = duration - revealTime;
  if (remaining > 0) yield* waitFor(remaining);
}
