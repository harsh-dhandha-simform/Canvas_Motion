// The Code component (Phase 9 first-class deliverable). Wraps Revideo's built-in
// `Code` node (Lezer-based syntax highlighting) with per-language grammars, line
// highlighting, and `steps[]` progressive reveal synced to scene time.
import { parser as cppParser } from "@lezer/cpp";
import { parser as javaParser } from "@lezer/java";
import { parser as jsParser } from "@lezer/javascript";
import { parser as pyParser } from "@lezer/python";
import { Code, CodeHighlighter, LezerHighlighter, lines, Node as RNode, Rect, Txt } from "@revideo/2d";
import { createRef, ThreadGenerator, waitFor } from "@revideo/core";
import { DesignTokens } from "../styles/designSystem";
import { CodeLanguage, CodeProps } from "../types";

// @lezer/javascript is used for both js and ts: it tokenizes common syntax
// (keywords/strings/comments/identifiers) correctly for both; TS-only constructs
// (interfaces, type annotations) may not get fully precise highlighting — an
// accepted scope limitation rather than a missing dedicated TS grammar.
const HIGHLIGHTERS: Partial<Record<CodeLanguage, CodeHighlighter>> = {
  js: new LezerHighlighter(jsParser),
  ts: new LezerHighlighter(jsParser),
  python: new LezerHighlighter(pyParser),
  java: new LezerHighlighter(javaParser),
  c: new LezerHighlighter(cppParser),
  cpp: new LezerHighlighter(cppParser),
  // go, rust, sql, bash, pseudocode: no bundled Lezer grammar — rendered as plain
  // monospace text (still correct/readable, just without token colors).
};

export function highlighterFor(language: CodeLanguage): CodeHighlighter | null {
  return HIGHLIGHTERS[language] ?? null;
}

function lineRanges(lineNumbers: number[]) {
  return lineNumbers.map((ln) => lines(ln - 1)); // schema is 1-based, Code ranges are 0-based
}

export function* renderCode(
  container: RNode,
  tokens: DesignTokens,
  props: CodeProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  const codeRef = createRef<Code>();
  const lineCount = props.code.split("\n").length;
  const fontSize = Math.min(32, Math.max(18, Math.floor(720 / Math.max(lineCount, 1))));

  container.add(
    <Rect width={width} height={height} fill={tokens.colors.codeBackground} radius={tokens.radius.md} padding={tokens.spacing(4)}>
      <Code
        ref={codeRef}
        code={props.code}
        fontFamily={"JetBrains Mono, Menlo, monospace"}
        fontSize={fontSize}
        highlighter={highlighterFor(props.language)}
        fill={"#e2e8f0"}
      />
    </Rect>,
  );

  if (props.caption) {
    container.add(
      <Txt
        text={props.caption}
        y={height / 2 - tokens.spacing(3)}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.7}
        fill={tokens.colors.textMuted}
      />,
    );
  }

  if (props.steps.length > 0) {
    const transition = 0.4;
    const perStep = Math.max((duration - transition * props.steps.length) / props.steps.length, 0.5);
    for (const step of props.steps) {
      yield* codeRef().selection(lineRanges(step.highlightLines), transition);
      yield* waitFor(perStep);
    }
  } else if (props.highlightLines.length > 0) {
    yield* codeRef().selection(lineRanges(props.highlightLines), 0.4);
    yield* waitFor(Math.max(duration - 0.4, 0));
  } else {
    yield* waitFor(duration);
  }
}
