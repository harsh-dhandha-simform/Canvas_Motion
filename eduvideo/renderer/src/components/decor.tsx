// Small decorative building blocks shared across scene templates so the video reads
// as a designed system, not a wall of text: a kicker "eyebrow" label, a gradient
// accent bar, and numbered / lettered chips. All colours/sizes come from tokens.
import { Gradient, Layout, Rect, Txt } from "@revideo/2d";
import { DesignTokens } from "../styles/designSystem";

/** A small uppercase kicker label with a leading accent tick — sits above headings. */
export function Eyebrow(tokens: DesignTokens, text: string) {
  return (
    <Layout layout direction={"row"} alignItems={"center"} gap={tokens.spacing(1.5)}>
      <Rect width={28} height={4} radius={2} fill={tokens.colors.primary} />
      <Txt
        text={text.toUpperCase()}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.6}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.primary}
        letterSpacing={3}
      />
    </Layout>
  );
}

/** A short horizontal gradient bar (primary → secondary accent). */
export function AccentBar(tokens: DesignTokens, width = 104) {
  const g = new Gradient({
    type: "linear",
    from: [-width / 2, 0],
    to: [width / 2, 0],
    stops: [
      { offset: 0, color: tokens.colors.primary },
      { offset: 1, color: tokens.colors.accent },
    ],
  });
  return <Rect width={width} height={6} radius={3} fill={g} />;
}

/** A round numbered chip (1, 2, 3…) used to enumerate list items. */
export function NumberChip(tokens: DesignTokens, n: number) {
  return (
    <Rect
      layout
      width={46}
      height={46}
      radius={23}
      fill={tokens.colors.surfaceAlt}
      stroke={tokens.colors.primary}
      lineWidth={1.5}
      alignItems={"center"}
      justifyContent={"center"}
    >
      <Txt
        text={String(n)}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.8}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.primary}
      />
    </Rect>
  );
}
