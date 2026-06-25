import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const MathFormulaSchema = z.object({
  title: z.string().optional(),
  /** Formula tokens. Each token has a type that determines its style.
   *  - "text"  → identifier/word
   *  - "var"   → italic variable letter
   *  - "num"   → number
   *  - "op"    → operator (+ − × ÷ =)
   *  - "frac"  → { numerator: string, denominator: string }
   *  - "sup"   → { base: string, exponent: string }
   *  - "sub"   → { base: string, subscript: string }
   *  - "sum"   → { lower: string, upper: string, body: string }
   *  - "sqrt"  → { body: string }
   */
  tokens: z.array(
    z.union([
      z.object({
        type: z.literal("text"),
        value: z.string(),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("var"),
        value: z.string(),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("num"),
        value: z.string(),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("op"),
        value: z.string(),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("frac"),
        numerator: z.array(z.any()),
        denominator: z.array(z.any()),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("sup"),
        base: z.array(z.any()),
        exponent: z.array(z.any()),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("sub"),
        base: z.array(z.any()),
        subscript: z.array(z.any()),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("sqrt"),
        body: z.array(z.any()),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("sum"),
        lower: z.array(z.any()),
        upper: z.array(z.any()),
        body: z.array(z.any()),
        color: z.string().optional(),
      }),
      z.object({
        type: z.literal("space"),
      }),
    ])
  ),
  /** Optional short description shown under the formula. */
  description: z.string().optional(),
  accentColor: z.string().optional(),
});

export type MathFormulaProps = z.infer<typeof MathFormulaSchema>;

type Token = NonNullable<MathFormulaProps["tokens"]>[number];
type NestedToken = Exclude<
  Token,
  | { type: "frac" }
  | { type: "sup" }
  | { type: "sub" }
  | { type: "sqrt" }
  | { type: "sum" }
>;

function colorize(token: NestedToken, fallback: string): string {
  if ("color" in token && token.color) return token.color;
  if (token.type === "var") return fallback;
  if (token.type === "num") return "#fb923c";
  if (token.type === "op") return "#94a3b8";
  return "#f1f5f9";
}

/**
 * Render a list of tokens into a span tree.
 * Caller is responsible for font + sizing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RenderTokens: React.FC<{ tokens: any[]; fallbackColor: string }> = ({
  tokens,
  fallbackColor,
}) => {
  return (
    <>
      {tokens.map((t, i) => (
        <TokenSpan key={i} token={t} fallbackColor={fallbackColor} />
      ))}
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TokenSpan: React.FC<{ token: any; fallbackColor: string }> = ({
  token,
  fallbackColor,
}) => {
  if (!token) return null;
  switch (token.type) {
    case "text":
      return (
        <span style={{ color: colorize(token, fallbackColor) }}>
          {token.value}
        </span>
      );
    case "var":
      return (
        <span
          style={{
            color: colorize(token, fallbackColor),
            fontStyle: "italic",
            fontFamily: "'Times New Roman', serif",
          }}
        >
          {token.value}
        </span>
      );
    case "num":
      return (
        <span
          style={{
            color: colorize(token, fallbackColor),
            fontFamily: "'Times New Roman', serif",
          }}
        >
          {token.value}
        </span>
      );
    case "op":
      return (
        <span
          style={{
            color: colorize(token, fallbackColor),
            fontFamily: "'Times New Roman', serif",
            padding: "0 6px",
          }}
        >
          {token.value}
        </span>
      );
    case "space":
      return <span style={{ display: "inline-block", width: 14 }} />;
    case "frac":
      return (
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            verticalAlign: "middle",
            margin: "0 4px",
            fontSize: "0.85em",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: 4,
              borderBottom: `2px solid ${token.color || fallbackColor}`,
            }}
          >
            <RenderTokens tokens={token.numerator} fallbackColor={fallbackColor} />
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: 4,
            }}
          >
            <RenderTokens tokens={token.denominator} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sup":
      return (
        <span style={{ display: "inline-block" }}>
          <RenderTokens tokens={token.base} fallbackColor={fallbackColor} />
          <span
            style={{
              display: "inline-block",
              verticalAlign: "super",
              fontSize: "0.65em",
              marginLeft: 2,
            }}
          >
            <RenderTokens tokens={token.exponent} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sub":
      return (
        <span style={{ display: "inline-block" }}>
          <RenderTokens tokens={token.base} fallbackColor={fallbackColor} />
          <span
            style={{
              display: "inline-block",
              verticalAlign: "sub",
              fontSize: "0.65em",
              marginLeft: 2,
            }}
          >
            <RenderTokens tokens={token.subscript} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sqrt":
      return (
        <span style={{ display: "inline-block", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontSize: "1.6em",
              color: token.color || fallbackColor,
              lineHeight: 1,
              fontFamily: "'Times New Roman', serif",
            }}
          >
            √
          </span>
          <span
            style={{
              display: "inline-block",
              paddingLeft: "0.7em",
              borderTop: `2px solid ${token.color || fallbackColor}`,
              paddingTop: 2,
            }}
          >
            <RenderTokens tokens={token.body} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sum": {
      const lower = token.lower || [];
      const upper = token.upper || [];
      const body = token.body || [];
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            margin: "0 4px",
          }}
        >
          <span
            style={{
              fontFamily: "'Times New Roman', serif",
              fontSize: "1.8em",
              color: token.color || fallbackColor,
              lineHeight: 1,
            }}
          >
            Σ
          </span>
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              fontSize: "0.55em",
              lineHeight: 1.2,
              marginLeft: 2,
              marginRight: 4,
            }}
          >
            <span>
              <RenderTokens tokens={upper} fallbackColor={fallbackColor} />
            </span>
            <span>
              <RenderTokens tokens={lower} fallbackColor={fallbackColor} />
            </span>
          </span>
          <span>
            <RenderTokens tokens={body} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    }
    default:
      return null;
  }
};

export const MathFormula: React.FC<MathFormulaProps> = ({
  title,
  tokens,
  description,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const formulaSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 16, stiffness: 120 },
    durationInFrames: 35,
  });
  const formulaScale = interpolate(formulaSpring, [0, 1], [0.94, 1]);
  const formulaOpacity = formulaSpring;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 80px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "#cbd5e1",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: 0,
            marginBottom: 32,
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          backgroundColor: "rgba(15, 23, 41, 0.85)",
          border: `2px solid ${accentColor}55`,
          borderRadius: 24,
          padding: "50px 80px",
          boxShadow: `0 30px 80px -20px rgba(0,0,0,0.7), 0 0 40px -10px ${accentColor}40`,
          opacity: formulaOpacity,
          transform: `scale(${formulaScale})`,
        }}
      >
        <div
          style={{
            fontSize: 96,
            lineHeight: 1.3,
            fontFamily: "'Times New Roman', serif",
            color: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <RenderTokens tokens={tokens} fallbackColor={accentColor} />
        </div>
      </div>

      {description && (
        <p
          style={{
            fontSize: 22,
            color: "#94a3b8",
            marginTop: 36,
            textAlign: "center",
            maxWidth: 1200,
            opacity: titleOpacity,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
};