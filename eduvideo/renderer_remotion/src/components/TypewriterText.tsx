import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { z } from "zod";

export const TypewriterTextSchema = z.object({
  lines: z.array(z.string()),
  accentColor: z.string().optional(),
  fontSize: z.number().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  charPerFrame: z.number().optional(), // How many chars revealed per frame
  showCursor: z.boolean().optional(),
});

export type TypewriterTextProps = z.infer<typeof TypewriterTextSchema>;

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  lines,
  accentColor = "#38BDF8",
  fontSize = 52,
  align = "left",
  charPerFrame = 1.5,
  showCursor = true,
}) => {
  const frame = useCurrentFrame();

  // Fade in the whole container
  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Total character count across all lines
  const allText = lines.join("\n");
  const totalChars = allText.length;

  // How many chars to show this frame (string slicing approach)
  const charsToShow = Math.floor(frame * charPerFrame);

  // Blinking cursor — blinks every 20 frames once typing is done
  const typingDone = charsToShow >= totalChars;
  const cursorVisible = typingDone
    ? Math.floor(frame / 20) % 2 === 0
    : true; // solid while typing

  // Split revealed text back into lines
  let charsBudget = charsToShow;
  const revealedLines = lines.map((line) => {
    if (charsBudget <= 0) return "";
    const revealed = line.slice(0, charsBudget);
    charsBudget -= line.length;
    return revealed;
  });

  return (
    <div
      style={{
        opacity: containerOpacity,
        display: "flex",
        flexDirection: "column",
        gap: fontSize * 0.5,
        textAlign: align,
        fontFamily: "'Fira Code', 'Courier New', monospace",
      }}
    >
      {revealedLines.map((line: string, i: number) => (
        <div key={i} style={{ position: "relative", minHeight: fontSize * 1.4 }}>
          <span
            style={{
              fontSize,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.4,
              letterSpacing: "-0.02em",
            }}
          >
            {line}
            {/* Show cursor only on the last actively-typing line */}
            {i === revealedLines.filter(Boolean).length - 1 && showCursor && (
              <span
                style={{
                  display: "inline-block",
                  width: fontSize * 0.55,
                  height: fontSize * 1.1,
                  backgroundColor: accentColor,
                  marginLeft: 4,
                  verticalAlign: "middle",
                  borderRadius: 2,
                  opacity: cursorVisible ? 1 : 0,
                  boxShadow: `0 0 12px ${accentColor}`,
                }}
              />
            )}
          </span>
        </div>
      ))}
    </div>
  );
};
