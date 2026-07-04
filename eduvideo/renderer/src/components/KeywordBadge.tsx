// A small pill showing a single keyword/term (used by DefinitionScene's keyword
// list and anywhere else a short tag needs to be called out).
import { Rect, Txt } from "@revideo/2d";
import { DesignTokens } from "../styles/designSystem";

export function KeywordBadge(tokens: DesignTokens, text: string) {
  // An outlined "chip": subtle surface fill with an accent border + accent text.
  // Reads as a tag on dark backgrounds without shouting like a solid fill.
  return (
    <Rect
      fill={tokens.colors.surfaceAlt}
      stroke={tokens.colors.primary}
      lineWidth={1.5}
      radius={tokens.radius.lg}
      paddingLeft={tokens.spacing(2.5)}
      paddingRight={tokens.spacing(2.5)}
      paddingTop={tokens.spacing(1.25)}
      paddingBottom={tokens.spacing(1.25)}
    >
      <Txt
        text={text}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.62}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.primary}
      />
    </Rect>
  );
}
