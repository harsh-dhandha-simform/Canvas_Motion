import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const EquationDerivationSchema = z.object({
  title: z.string().optional(),
  /** Each step in the derivation. The tokens field uses the same token shape as MathFormula. */
  steps: z.array(
    z.object({
      label: z.string().optional(),
      tokens: z.array(z.any()),
      /** If true, the arrow leading INTO this step is highlighted. */
      highlight: z.boolean().optional(),
      /** If true, this step is rendered as the final result (larger). */
      final: z.boolean().optional(),
      /** Optional short justification shown to the right of the arrow. */
      note: z.string().optional(),
    })
  ),
  accentColor: z.string().optional(),
});

export type EquationDerivationProps = z.infer<typeof EquationDerivationSchema>;

export const EquationDerivation: React.FC<EquationDerivationProps> = ({
  title,
  steps,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Stagger each step
  const STEP_GAP = 24; // frames between steps
  const springs = steps.map((_, i) =>
    spring({
      frame: frame - (10 + i * STEP_GAP),
      fps,
      config: { damping: 14, stiffness: 140 },
      durationInFrames: 35,
    })
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "50px 80px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 30,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {steps.map((step, i) => {
          const sp = springs[i];
          const isFinal = !!step.final;
          const isHighlight = !!step.highlight;
          const fontSize = isFinal ? 78 : 64;

          // Arrow between this step and the previous one
          const arrowSp = i > 0 ? springs[i - 1] : 0;
          const arrowOpacity = arrowSp;

          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: arrowOpacity,
                  }}
                >
                  {/* Down arrow */}
                  <svg width={60} height={30} viewBox="0 0 60 30">
                    <defs>
                      <marker
                        id={`eq-arrow-${i}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={accentColor} />
                      </marker>
                    </defs>
                    <line
                      x1={30}
                      y1={2}
                      x2={30}
                      y2={20}
                      stroke={accentColor}
                      strokeWidth={3}
                      markerEnd={`url(#eq-arrow-${i})`}
                      style={{
                        filter: isHighlight
                          ? `drop-shadow(0 0 6px ${accentColor})`
                          : undefined,
                      }}
                    />
                  </svg>
                  {step.note && (
                    <span
                      style={{
                        color: isHighlight ? accentColor : "#94a3b8",
                        fontSize: 16,
                        fontFamily: "Fira Code, monospace",
                        fontStyle: "italic",
                      }}
                    >
                      ← {step.note}
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: sp,
                  transform: `translateY(${interpolate(sp, [0, 1], [16, 0])}px)`,
                }}
              >
                {step.label && (
                  <span
                    style={{
                      fontSize: 18,
                      color: "#64748b",
                      fontFamily: "Fira Code, monospace",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      width: 80,
                      textAlign: "right",
                    }}
                  >
                    {step.label}
                  </span>
                )}

                <div
                  style={{
                    backgroundColor: isFinal
                      ? `${accentColor}1A`
                      : "rgba(15, 23, 41, 0.7)",
                    border: `2px solid ${
                      isHighlight || isFinal ? accentColor : "#334155"
                    }`,
                    borderRadius: 14,
                    padding: isFinal ? "20px 48px" : "12px 32px",
                    boxShadow: isHighlight
                      ? `0 0 30px -5px ${accentColor}80`
                      : isFinal
                      ? `0 0 40px -8px ${accentColor}66`
                      : "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    style={{
                      fontSize,
                      fontFamily: "'Times New Roman', serif",
                      color: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {/* Reuse MathFormula's renderer by mounting a tiny adapter.
                        Simpler: replicate the inline renderer inline here. */}
                    <InlineTokens
                      tokens={step.tokens}
                      fallbackColor={accentColor}
                    />
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Inline duplicated renderer so we don't depend on MathFormula's internals.
// Keeps the per-step rendering simple and self-contained.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InlineTokens: React.FC<{ tokens: any[]; fallbackColor: string }> = ({
  tokens,
  fallbackColor,
}) => (
  <>
    {tokens.map((t, i) => (
      <InlineToken key={i} token={t} fallbackColor={fallbackColor} />
    ))}
  </>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InlineToken: React.FC<{ token: any; fallbackColor: string }> = ({
  token,
  fallbackColor,
}) => {
  if (!token) return null;
  switch (token.type) {
    case "text":
      return <span style={{ color: token.color || "#f1f5f9" }}>{token.value}</span>;
    case "var":
      return (
        <span
          style={{
            color: token.color || fallbackColor,
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
            color: token.color || "#fb923c",
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
            color: token.color || "#94a3b8",
            fontFamily: "'Times New Roman', serif",
            padding: "0 4px",
          }}
        >
          {token.value}
        </span>
      );
    case "space":
      return <span style={{ display: "inline-block", width: 12 }} />;
    case "frac":
      return (
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            verticalAlign: "middle",
            margin: "0 4px",
            fontSize: "0.8em",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: 3,
              borderBottom: `2px solid ${token.color || fallbackColor}`,
            }}
          >
            <InlineTokens tokens={token.numerator} fallbackColor={fallbackColor} />
          </span>
          <span style={{ display: "flex", alignItems: "center", paddingTop: 3 }}>
            <InlineTokens tokens={token.denominator} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sup":
      return (
        <span style={{ display: "inline-block" }}>
          <InlineTokens tokens={token.base} fallbackColor={fallbackColor} />
          <span
            style={{
              display: "inline-block",
              verticalAlign: "super",
              fontSize: "0.6em",
              marginLeft: 2,
            }}
          >
            <InlineTokens tokens={token.exponent} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    case "sub":
      return (
        <span style={{ display: "inline-block" }}>
          <InlineTokens tokens={token.base} fallbackColor={fallbackColor} />
          <span
            style={{
              display: "inline-block",
              verticalAlign: "sub",
              fontSize: "0.6em",
              marginLeft: 2,
            }}
          >
            <InlineTokens tokens={token.subscript} fallbackColor={fallbackColor} />
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
              fontSize: "1.5em",
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
            <InlineTokens tokens={token.body} fallbackColor={fallbackColor} />
          </span>
        </span>
      );
    default:
      return null;
  }
};