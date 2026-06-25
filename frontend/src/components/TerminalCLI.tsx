import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";

export const TerminalCLISchema = z.object({
  title: z.string().optional(),
  /** First line is the prompt + command. Subsequent lines are output. */
  command: z.string(),
  /** Output lines printed below the command, one per element. */
  output: z.array(z.string()),
  /** Show a typing animation for the command itself. */
  typingCommand: z.boolean().optional(),
  /** Frames between output lines. */
  outputLineDelay: z.number().optional(),
  /** Frames per character when typing the command. */
  typingSpeed: z.number().optional(),
  /** Optional caption/explanation shown above the terminal. */
  caption: z.string().optional(),
  accentColor: z.string().optional(),
  /** Optional highlight lines (1-indexed within `output`) — colored differently. */
  highlightLines: z.array(z.number().int().min(1)).optional(),
  /** Optional theme override — "dark" | "matrix" | "amber". */
  theme: z.enum(["dark", "matrix", "amber"]).optional(),
});

export type TerminalCLIProps = z.infer<typeof TerminalCLISchema>;

const THEMES = {
  dark: {
    bg: "#0a0e1a",
    chrome: "#1e293b",
    text: "#e2e8f0",
    prompt: "#34d399",
    comment: "#64748b",
    highlight: "#fbbf24",
  },
  matrix: {
    bg: "#000000",
    chrome: "#0a1f0a",
    text: "#00ff66",
    prompt: "#00ff66",
    comment: "#006622",
    highlight: "#ffffff",
  },
  amber: {
    bg: "#1a0f00",
    chrome: "#3f2a14",
    text: "#fbbf24",
    prompt: "#f59e0b",
    comment: "#92400e",
    highlight: "#fef3c7",
  },
};

export const TerminalCLI: React.FC<TerminalCLIProps> = ({
  title,
  command,
  output,
  typingCommand = true,
  outputLineDelay = 8,
  typingSpeed = 0.6,
  caption,
  accentColor = "#34d399",
  highlightLines = [],
  theme = "dark",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palette = THEMES[theme];

  // Container spring
  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 30,
  });

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Command typing
  const typedChars = typingCommand
    ? Math.min(command.length, Math.floor((frame - 10) * typingSpeed))
    : command.length;
  const typedCommand = command.slice(0, Math.max(0, typedChars));
  const commandDone = typedChars >= command.length;

  // Output reveals line by line starting after command completes
  const outputStart = typingCommand
    ? 10 + Math.ceil(command.length / typingSpeed) + 4
    : 14;

  const isHighlightLine = (idx: number) => highlightLines.includes(idx + 1);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
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
            marginBottom: 12,
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}
      {caption && (
        <p
          style={{
            color: "#94a3b8",
            fontSize: 20,
            margin: 0,
            marginBottom: 28,
            opacity: titleOpacity,
          }}
        >
          {caption}
        </p>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 400,
          backgroundColor: palette.bg,
          borderRadius: 14,
          border: `1px solid ${palette.chrome}`,
          overflow: "hidden",
          boxShadow: `0 30px 80px -20px rgba(0,0,0,0.8), 0 0 40px -10px ${accentColor}40`,
          opacity: containerSpring,
          transform: `translateY(${interpolate(containerSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            height: 42,
            backgroundColor: palette.chrome,
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            gap: 8,
            borderBottom: `1px solid ${palette.chrome}`,
          }}
        >
          {["#f87171", "#facc15", "#4ade80"].map((c, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: c,
                opacity: 0.85,
              }}
            />
          ))}
          <span
            style={{
              marginLeft: 16,
              color: palette.comment,
              fontSize: 12,
              fontFamily: "Fira Code, monospace",
              letterSpacing: "0.05em",
            }}
          >
            ~/projects/{command.split(" ")[0] || "bash"}
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 28px",
            fontFamily: "Fira Code, 'Courier New', monospace",
            fontSize: 22,
            lineHeight: 1.55,
            color: palette.text,
          }}
        >
          {/* Prompt + command line */}
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                color: palette.prompt,
                fontWeight: 700,
                marginRight: 10,
                textShadow: `0 0 8px ${palette.prompt}80`,
              }}
            >
              $
            </span>
            <span style={{ whiteSpace: "pre" }}>{typedCommand}</span>
            {!commandDone && (
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 22,
                  backgroundColor: palette.prompt,
                  marginLeft: 2,
                  verticalAlign: "middle",
                  opacity: Math.floor(frame / 10) % 2 === 0 ? 1 : 0,
                  boxShadow: `0 0 8px ${palette.prompt}`,
                }}
              />
            )}
          </div>

          {/* Output */}
          {commandDone &&
            output.map((line, i) => {
              const lineFrame = frame - outputStart - i * outputLineDelay;
              const opacity = interpolate(lineFrame, [0, 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });
              const isHighlight = isHighlightLine(i);
              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    color: isHighlight ? palette.highlight : palette.text,
                    backgroundColor: isHighlight
                      ? `${palette.highlight}15`
                      : "transparent",
                    padding: isHighlight ? "2px 6px" : 0,
                    marginLeft: isHighlight ? -6 : 0,
                    borderLeft: isHighlight
                      ? `3px solid ${palette.highlight}`
                      : "3px solid transparent",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {line || " "}
                </div>
              );
            })}

          {/* Cursor at the end while output streams */}
          {commandDone && (
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 20,
                backgroundColor: palette.text,
                marginTop: 4,
                opacity:
                  frame <
                  outputStart + output.length * outputLineDelay + 30
                    ? Math.floor(frame / 10) % 2 === 0
                      ? 1
                      : 0
                    : 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};