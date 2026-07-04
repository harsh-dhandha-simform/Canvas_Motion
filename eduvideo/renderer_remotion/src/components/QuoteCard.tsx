import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const QuoteCardSchema = z.object({
  quote: z.string(),
  author: z.string().optional(),
  role: z.string().optional(),
  accentColor: z.string().optional(),
  highlightWords: z.array(z.string()).optional(),
  align: z.enum(["left", "center"]).optional(),
});

export type QuoteCardProps = z.infer<typeof QuoteCardSchema>;

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  author,
  role,
  accentColor = "#f59e0b",
  highlightWords = [],
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container spring entrance
  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 1.2 },
    durationInFrames: 35,
  });

  // Quote mark draws in with bezier
  const quoteMarkOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const quoteMarkScale = interpolate(frame, [0, 25], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // playful overshoot
  });

  // Highlight sweep — a background slides in from left
  const highlightSweep = interpolate(frame, [30, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Author slides in after quote
  const authorSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 25,
  });
  const authorX = interpolate(authorSpring, [0, 1], [40, 0]);

  // Render quote with highlighted words
  const words = quote.split(" ");
  const renderedWords = words.map((word, i) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const isHighlighted = highlightWords.some(
      (h) => h.toLowerCase() === cleanWord
    );
    return (
      <span key={i} style={{ display: "inline" }}>
        {isHighlighted ? (
          <span style={{ position: "relative", display: "inline" }}>
            {/* Highlight bar sweeps from left */}
            <span
              style={{
                position: "absolute",
                inset: "-2px -4px",
                backgroundColor: accentColor,
                borderRadius: 4,
                zIndex: 0,
                clipPath: `inset(0 ${(1 - highlightSweep) * 100}% 0 0)`,
                opacity: 0.35,
              }}
            />
            <span style={{ position: "relative", zIndex: 1, color: accentColor, fontWeight: 900 }}>{word}</span>
          </span>
        ) : (
          word
        )}{" "}
      </span>
    );
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        padding: "80px 120px",
        boxSizing: "border-box",
        textAlign: align,
        opacity: containerSpring,
        transform: `scale(${interpolate(containerSpring, [0, 1], [0.92, 1])})`,
      }}
    >
      {/* Opening quote mark */}
      <div
        style={{
          fontSize: 180,
          lineHeight: 0.8,
          color: accentColor,
          opacity: quoteMarkOpacity * 0.25,
          transform: `scale(${quoteMarkScale})`,
          transformOrigin: "left center",
          fontFamily: "Georgia, serif",
          marginBottom: 16,
          alignSelf: align === "center" ? "center" : "flex-start",
        }}
      >
        "
      </div>

      {/* Quote text */}
      <p
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: "#f1f5f9",
          lineHeight: 1.4,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.02em",
          maxWidth: 1400,
          margin: 0,
        }}
      >
        {renderedWords}
      </p>

      {/* Author */}
      {author && (
        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            opacity: authorSpring,
            transform: `translateX(${authorX}px)`,
            alignItems: align === "center" ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 60,
              height: 3,
              backgroundColor: accentColor,
              borderRadius: 2,
              boxShadow: `0 0 8px ${accentColor}`,
              marginBottom: 12,
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: accentColor, fontFamily: "Inter, sans-serif" }}>
            — {author}
          </span>
          {role && (
            <span style={{ fontSize: 18, color: "#64748b", fontFamily: "Inter, sans-serif" }}>
              {role}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
