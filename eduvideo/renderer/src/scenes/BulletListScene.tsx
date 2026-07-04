import { Layout, Node as RNode, Rect, Txt } from "@revideo/2d";
import { createRef, sequence, ThreadGenerator, waitFor } from "@revideo/core";
import { NumberChip } from "../components/decor";
import { DesignTokens } from "../styles/designSystem";
import { BulletListProps } from "../types";

export function* BulletListScene(
  container: RNode,
  tokens: DesignTokens,
  props: BulletListProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped heading never
  // overlaps the list — its rendered height pushes the list down automatically.
  // Each item is an elevated card with a numbered chip; items slide + fade in,
  // staggered, so the list builds rather than appearing all at once.
  const outerRef = createRef<Layout>();
  container.add(
    <Layout ref={outerRef} layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4.5)}>
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

  const listRef = createRef<Layout>();
  outerRef().add(<Layout ref={listRef} layout direction={"column"} gap={tokens.spacing(2.5)} alignItems={"stretch"} />);

  const cardWidth = width * 0.62;
  const itemRefs = props.items.map(() => createRef<Rect>());
  props.items.forEach((item, i) => {
    listRef().add(
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
        {NumberChip(tokens, i + 1)}
        <Txt
          text={item}
          fontFamily={tokens.font.family}
          fontSize={tokens.font.sizeMD}
          fill={tokens.colors.text}
          width={cardWidth - tokens.spacing(11)}
          textWrap
        />
      </Rect>,
    );
  });

  const revealStep = Math.min(0.4, Math.max(duration * 0.5, 0.2) / Math.max(props.items.length, 1));
  yield* sequence(revealStep, ...itemRefs.map((ref) => ref().opacity(1, 0.35)));
  const revealTime = revealStep * Math.max(props.items.length - 1, 0) + 0.35;
  const remaining = duration - revealTime;
  if (remaining > 0) yield* waitFor(remaining);
}
