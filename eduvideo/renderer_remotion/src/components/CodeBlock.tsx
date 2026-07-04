import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const CodeBlockSchema = z.object({
  title: z.string().optional(),
  code: z.string(),
  language: z.string().optional(),
  accentColor: z.string().optional(),
  revealMode: z.enum(["lines", "chars", "instant"]).optional(),
  highlightLines: z.array(z.number()).optional(), // 1-indexed line numbers to highlight
  fontSize: z.number().optional(),
});

export type CodeBlockProps = z.infer<typeof CodeBlockSchema>;

// Simple keyword colorizer for a few languages
const KEYWORDS = [
  "const", "let", "var", "function", "return", "import", "from", "export",
  "default", "if", "else", "for", "while", "class", "new", "async", "await",
  "def", "print", "type", "interface", "extends", "implements", "public",
  "private", "static", "void", "int", "string", "boolean", "null", "undefined",
  "true", "false",
];

function colorizeToken(token: string, accentColor: string): React.ReactNode {
  if (KEYWORDS.includes(token.replace(/[^a-zA-Z]/g, ""))) {
    return <span style={{ color: "#c084fc" }}>{token}</span>;
  }
  if (/^["'`]/.test(token) || (/["'`]$/).test(token)) {
    return <span style={{ color: "#86efac" }}>{token}</span>;
  }
  if (/^\d+$/.test(token)) {
    return <span style={{ color: "#fb923c" }}>{token}</span>;
  }
  if (token.startsWith("//") || token.startsWith("#")) {
    return <span style={{ color: "#64748b", fontStyle: "italic" }}>{token}</span>;
  }
  return token;
}

function tokenizeLine(line: string, accentColor: string): React.ReactNode[] {
  // Simple split on word boundaries for quick colorization
  const tokens = line.split(/(\s+|[(){}[\].,;:=<>!&|+\-*/]+)/);
  return tokens.map((token, i) => (
    <React.Fragment key={i}>{colorizeToken(token, accentColor)}</React.Fragment>
  ));
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  title,
  code,
  language = "typescript",
  accentColor = "#38BDF8",
  revealMode = "lines",
  highlightLines = [],
  fontSize = 22,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = code.split("\n");

  // Title fade
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Container springs in
  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
    durationInFrames: 30,
  });
  const containerY = interpolate(containerSpring, [0, 1], [40, 0]);

  // Lines reveal — one line every 8 frames
  const framesPerLine = revealMode === "lines" ? 8 : 1;
  const visibleLineCount =
    revealMode === "instant"
      ? lines.length
      : Math.floor((frame - 10) / framesPerLine) + 1;

  const visibleLines = lines.slice(0, Math.max(0, visibleLineCount));

  // Char-mode: for the last visible line, reveal chars
  const lastLineChars =
    revealMode === "chars" && visibleLines.length > 0 && visibleLines.length <= lines.length
      ? ((frame - 10) % framesPerLine === 0
          ? lines[visibleLines.length - 1].length
          : Math.floor(((frame - 10) % (framesPerLine * lines[visibleLines.length - 1].length || 1))))
      : -1; // -1 means full line

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* Title bar */}
      {title && (
        <div
          style={{
            opacity: titleOpacity,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 6,
              height: 40,
              backgroundColor: accentColor,
              borderRadius: 3,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#f1f5f9",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 16,
              color: "#475569",
              backgroundColor: "#1e293b",
              padding: "4px 12px",
              borderRadius: 6,
              fontFamily: "Fira Code, monospace",
              marginLeft: "auto",
            }}
          >
            {language}
          </span>
        </div>
      )}

      {/* Code container */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#0f1729",
          border: "1px solid #1e293b",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          transform: `translateY(${containerY}px)`,
          opacity: containerSpring,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            height: 44,
            backgroundColor: "#1e293b",
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
            gap: 8,
            borderBottom: "1px solid #334155",
          }}
        >
          {["#f87171", "#facc15", "#4ade80"].map((color, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: color,
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        {/* Code lines */}
        <div
          style={{
            padding: "24px 32px",
            fontFamily: "Fira Code, 'Courier New', monospace",
            fontSize,
            lineHeight: 1.7,
            color: "#e2e8f0",
          }}
        >
          {visibleLines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightLines.includes(lineNum);
            const isLastTyping = revealMode === "chars" && i === visibleLines.length - 1;
            const displayLine = isLastTyping && lastLineChars >= 0 ? line.slice(0, lastLineChars) : line;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  backgroundColor: isHighlighted
                    ? `rgba(${accentColor === "#38BDF8" ? "56,189,248" : "245,158,11"},0.12)`
                    : "transparent",
                  borderLeft: isHighlighted ? `3px solid ${accentColor}` : "3px solid transparent",
                  paddingLeft: 12,
                  margin: "0 -32px 0 -44px",
                  paddingRight: 32,
                  borderRadius: isHighlighted ? "0 4px 4px 0" : 0,
                }}
              >
                {/* Line number */}
                <span
                  style={{
                    color: "#334155",
                    minWidth: 32,
                    marginRight: 24,
                    userSelect: "none",
                    textAlign: "right",
                    flexShrink: 0,
                    fontSize: fontSize * 0.85,
                  }}
                >
                  {lineNum}
                </span>
                {/* Code */}
                <span style={{ whiteSpace: "pre" }}>
                  {tokenizeLine(displayLine, accentColor)}
                </span>
              </div>
            );
          })}
          {/* Cursor on last line while revealing */}
          {revealMode !== "instant" && visibleLineCount <= lines.length && (
            <span
              style={{
                display: "inline-block",
                width: fontSize * 0.55,
                height: fontSize * 1.1,
                backgroundColor: accentColor,
                borderRadius: 2,
                verticalAlign: "middle",
                marginLeft: 2,
                opacity: Math.floor(frame / 12) % 2 === 0 ? 1 : 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
