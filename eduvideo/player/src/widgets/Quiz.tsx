// quiz — pick an option, get immediate correct/incorrect feedback.
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { QuizWidgetProps } from "../types";
import { Button } from "./ui";

export function Quiz({ props }: { props: QuizWidgetProps }) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(2) }}>
      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{props.question}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: t.space(1.25) }}>
        {(props.options ?? []).map((opt, idx) => {
          const isPicked = picked === opt;
          const isAnswer = opt === props.answer;
          let border = t.colors.border;
          let bg = t.colors.surface;
          if (answered && isAnswer) {
            border = t.colors.correct;
            bg = t.colors.surfaceAlt;
          } else if (answered && isPicked && !isAnswer) {
            border = t.colors.incorrect;
            bg = t.colors.surfaceAlt;
          }
          return (
            <button
              key={idx}
              onClick={() => !answered && setPicked(opt)}
              style={{
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: t.space(1.5),
                padding: t.space(1.75),
                borderRadius: t.radius.md,
                border: `1.5px solid ${border}`,
                background: bg,
                color: t.colors.text,
                fontSize: 15,
                transition: `all ${t.motion.fast}`,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  flex: "0 0 auto",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  color: t.colors.textMuted,
                  border: `1.5px solid ${t.colors.border}`,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
              {answered && isAnswer && <span style={{ marginLeft: "auto", color: t.colors.correct }}>✓</span>}
              {answered && isPicked && !isAnswer && (
                <span style={{ marginLeft: "auto", color: t.colors.incorrect }}>✗</span>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ display: "flex", alignItems: "center", gap: t.space(2) }}>
          <span style={{ color: picked === props.answer ? t.colors.correct : t.colors.incorrect, fontWeight: 700 }}>
            {picked === props.answer ? "Correct!" : "Not quite — try again."}
          </span>
          <Button variant="ghost" onClick={() => setPicked(null)}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
