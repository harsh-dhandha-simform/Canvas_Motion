// Small, reusable, style-driven container used by BulletList/Definition/Comparison
// scenes. An elevated matte surface: rounded, soft drop-shadow (from the design
// system's elevation token) and a subtle border so it reads as a layer floating
// above the backdrop rather than a flat box. Nothing hardcodes color/spacing.
import { Rect, RectProps } from "@revideo/2d";
import { DesignTokens } from "../styles/designSystem";

export function Card(tokens: DesignTokens, props: RectProps = {}) {
  return (
    <Rect
      layout
      fill={tokens.colors.surface}
      stroke={tokens.colors.border}
      lineWidth={1.5}
      radius={tokens.radius.lg}
      padding={tokens.spacing(4)}
      direction={"column"}
      gap={tokens.spacing(2)}
      shadowColor={tokens.elevation.color}
      shadowBlur={tokens.elevation.blur}
      shadowOffsetY={tokens.elevation.offsetY}
      {...props}
    />
  );
}
