import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const GlossaryCardsSchema = z.object({
  title: z.string().optional(),
  /** Term cards. Each gets an entry in a grid. */
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      /** Optional 1-2 character symbol/icon. */
      icon: z.string().optional(),
      color: z.string().optional(),
    })
  ),
  /** "2x2", "2x3", "3x2", "3x3" — controls grid. Default auto. */
  grid: z.enum(["auto", "2x2", "2x3", "3x2", "3x3"]).optional(),
  accentColor: z.string().optional(),
});

export type GlossaryCardsProps = z.infer<typeof GlossaryCardsSchema>;

const CARD_PALETTE = [
  "#38BDF8",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

export const GlossaryCards: React.FC<GlossaryCardsProps> = ({
  title,
  terms,
  grid = "auto",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Decide grid columns
  let cols = 2;
  if (grid === "auto") {
    if (terms.length <= 4) cols = 2;
    else if (terms.length <= 6) cols = 3;
    else cols = 3;
  } else {
    cols = parseInt(grid[0], 10);
  }

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const springs = terms.map((_, i) =>
    spring({
      frame: frame - (12 + i * 7),
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
        padding: "50px 70px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 32,
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
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 24,
          alignContent: "center",
        }}
      >
        {terms.map((t, i) => {
          const sp = springs[i];
          const color = t.color || CARD_PALETTE[i % CARD_PALETTE.length];
          const scale = interpolate(sp, [0, 1], [0.88, 1]);
          const y = interpolate(sp, [0, 1], [24, 0]);

          return (
            <div
              key={i}
              style={{
                backgroundColor: "rgba(15, 23, 41, 0.85)",
                border: `1.5px solid ${color}66`,
                borderRadius: 18,
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: sp,
                transform: `translateY(${y}px) scale(${scale})`,
                boxShadow: `0 16px 40px -10px rgba(0,0,0,0.5), 0 0 30px -10px ${color}50`,
              }}
            >
              {/* Top row: icon + term */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${color}33`,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: `${color}22`,
                    border: `2px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 0 12px ${color}66`,
                    fontSize: 26,
                  }}
                >
                  {t.icon || ""}
                </div>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color,
                    letterSpacing: "-0.01em",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {t.term}
                </span>
              </div>

              {/* Definition */}
              <span
                style={{
                  fontSize: 16,
                  color: "#cbd5e1",
                  lineHeight: 1.55,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {t.definition}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};