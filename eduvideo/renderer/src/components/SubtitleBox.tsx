// Global subtitle overlay (baked-in transcript — MASTER_CONTEXT.md §2: "the
// transcript lives in the video, not duplicated elsewhere"). Mounted once, driven
// in parallel with the scene sequence by `playSubtitles`, independent of whichever
// template is currently on screen.
import { Layout, Rect, Txt } from "@revideo/2d";
import { Reference, ThreadGenerator, waitFor } from "@revideo/core";
import { DesignTokens } from "../styles/designSystem";
import { Subtitle } from "../types";

export function SubtitleBox(tokens: DesignTokens, y: number, containerRef: Reference<Rect>, wordsRef: Reference<Layout>) {
  return (
    <Rect
      ref={containerRef}
      layout
      y={y}
      zIndex={50}
      fill={"rgba(13, 15, 26, 0.82)"}
      stroke={tokens.colors.border}
      lineWidth={1.5}
      radius={tokens.radius.md}
      paddingLeft={tokens.spacing(3.5)}
      paddingRight={tokens.spacing(3.5)}
      paddingTop={tokens.spacing(1.75)}
      paddingBottom={tokens.spacing(1.75)}
      maxWidth={"82%"}
      opacity={0}
      shadowColor={"rgba(0, 0, 0, 0.5)"}
      shadowBlur={24}
      shadowOffsetY={8}
    >
      <Layout ref={wordsRef} layout direction={"row"} gap={tokens.spacing(1)} wrap={"wrap"} justifyContent={"center"} />
    </Rect>
  );
}

function renderWords(tokens: DesignTokens, wordsLayout: Layout, text: string, highlight: string[]) {
  wordsLayout.removeChildren();
  const highlightSet = new Set(highlight.map((h) => h.toLowerCase()));
  const words = text.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const bare = word.replace(/[.,!?;:'"]/g, "").toLowerCase();
    const isHighlighted = highlightSet.has(bare);
    wordsLayout.add(
      <Txt
        text={word}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM}
        fontWeight={isHighlighted ? tokens.font.weightBold : tokens.font.weightRegular}
        fill={isHighlighted ? tokens.colors.highlight : "#eef1fb"}
      />,
    );
  }
}

/** Runs in parallel (via `all(...)`) with the main scene sequence, on the same clock. */
export function* playSubtitles(
  tokens: DesignTokens,
  container: Rect,
  wordsLayout: Layout,
  subtitles: Subtitle[],
): ThreadGenerator {
  let elapsed = 0;
  for (const sub of subtitles) {
    if (sub.start > elapsed) {
      yield* waitFor(sub.start - elapsed);
      elapsed = sub.start;
    }
    renderWords(tokens, wordsLayout, sub.text, sub.highlight);
    container.opacity(1);
    const duration = Math.max(sub.end - sub.start, 0);
    yield* waitFor(duration);
    elapsed += duration;
    container.opacity(0);
  }
}
