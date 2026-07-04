import { Layout, Node as RNode, Rect, Txt } from "@revideo/2d";
import { all, createRef, ThreadGenerator, waitFor } from "@revideo/core";
import { Eyebrow } from "../components/decor";
import { DesignTokens } from "../styles/designSystem";
import { QuizProps } from "../types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function* QuizScene(
  container: RNode,
  tokens: DesignTokens,
  props: QuizProps,
  width: number,
  _height: number,
  duration: number,
): ThreadGenerator {
  // A flex column (not fixed y-offsets) so a long, wrapped question never
  // overlaps the options — its rendered height pushes them down automatically.
  // Each option is a card with a lettered chip; the correct one glows green on
  // reveal while the chip flips to a checkmark.
  const optionRefs = props.options.map(() => createRef<Rect>());
  const chipRefs = props.options.map(() => createRef<Rect>());
  const letterRefs = props.options.map(() => createRef<Txt>());
  container.add(
    <Layout layout direction={"column"} alignItems={"center"} gap={tokens.spacing(4)}>
      {Eyebrow(tokens, "Quick check")}
      <Txt
        text={props.question}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeLG}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.text}
        textAlign={"center"}
        width={width * 0.8}
        textWrap
      />
      <Layout layout direction={"column"} gap={tokens.spacing(2)} alignItems={"stretch"}>
        {props.options.map((option, i) => (
          <Rect
            ref={optionRefs[i]}
            layout
            direction={"row"}
            alignItems={"center"}
            gap={tokens.spacing(2.5)}
            width={width * 0.52}
            fill={tokens.colors.surface}
            stroke={tokens.colors.border}
            lineWidth={1.5}
            radius={tokens.radius.md}
            padding={tokens.spacing(2)}
            shadowColor={tokens.elevation.color}
            shadowBlur={tokens.elevation.blur * 0.4}
            shadowOffsetY={tokens.elevation.offsetY * 0.4}
          >
            <Rect
              ref={chipRefs[i]}
              layout
              width={40}
              height={40}
              radius={tokens.radius.sm}
              fill={tokens.colors.surfaceAlt}
              stroke={tokens.colors.border}
              lineWidth={1.5}
              alignItems={"center"}
              justifyContent={"center"}
            >
              <Txt
                ref={letterRefs[i]}
                text={LETTERS[i] ?? String(i + 1)}
                fontFamily={tokens.font.family}
                fontSize={tokens.font.sizeSM * 0.78}
                fontWeight={tokens.font.weightBold}
                fill={tokens.colors.textMuted}
              />
            </Rect>
            <Txt text={option} fontFamily={tokens.font.family} fontSize={tokens.font.sizeSM} fill={tokens.colors.text} />
          </Rect>
        ))}
      </Layout>
    </Layout>,
  );

  const revealTransition = 0.4;
  const revealAt = Math.min(Math.max(duration - 1.5, duration * 0.6), Math.max(duration - revealTransition, 0));
  yield* waitFor(revealAt);
  const answerIndex = props.options.indexOf(props.answer);
  if (answerIndex >= 0) {
    letterRefs[answerIndex]().text("✓"); // set instantly; only colours tween below
    yield* all(
      optionRefs[answerIndex]().stroke(tokens.colors.correct, revealTransition),
      optionRefs[answerIndex]().lineWidth(3, revealTransition),
      chipRefs[answerIndex]().fill(tokens.colors.correct, revealTransition),
      chipRefs[answerIndex]().stroke(tokens.colors.correct, revealTransition),
      letterRefs[answerIndex]().fill(tokens.colors.primaryText, revealTransition),
    );
  }
  const remaining = duration - revealAt - (answerIndex >= 0 ? revealTransition : 0);
  if (remaining > 0) yield* waitFor(remaining);
}
