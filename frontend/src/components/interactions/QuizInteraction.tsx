import { useState } from "react";
import { useTheme } from "../../ThemeContext";

interface QuizInteractionProps {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  onComplete: () => void;
}

export default function QuizInteraction({
  question,
  options,
  correctAnswer,
  explanation,
  onComplete,
}: QuizInteractionProps) {
  const theme = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionClick = (idx: number) => {
    if (submitted) return;
    setSelectedIdx(idx);
  };

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    setSubmitted(true);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: "#fff",
        fontFamily: theme.font || "sans-serif",
      }}
    >
      <div
        style={{
          padding: "4px 10px",
          backgroundColor: `${theme.primary}26`,
          border: `1px solid ${theme.primary}4d`,
          borderRadius: "4px",
          alignSelf: "flex-start",
          fontSize: "12px",
          fontWeight: "600",
          color: theme.primary,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Knowledge Check
      </div>

      <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0 12px 0", lineHeight: "1.4" }}>
        {question}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === correctAnswer;

          let btnBg = "#1f2937";
          let btnBorder = "1px solid #374151";
          let icon = "";

          if (submitted) {
            if (isCorrect) {
              btnBg = `${theme.accent}1a`;
              btnBorder = `1px solid ${theme.accent}`;
              icon = " ✓";
            } else if (isSelected) {
              btnBg = "rgba(239, 68, 68, 0.1)";
              btnBorder = "1px solid #ef4444";
              icon = " ✗";
            }
          } else if (isSelected) {
            btnBg = "#374151";
            btnBorder = `1.5px solid ${theme.primary}`;
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              disabled={submitted}
              style={{
                textAlign: "left",
                padding: "14px",
                borderRadius: "8px",
                backgroundColor: btnBg,
                border: btnBorder,
                color: "#fff",
                fontSize: "15px",
                cursor: submitted ? "default" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                outline: "none",
              }}
              onMouseOver={(e) => {
                if (!submitted && !isSelected) {
                  e.currentTarget.style.backgroundColor = "#2d3748";
                }
              }}
              onMouseOut={(e) => {
                if (!submitted && !isSelected) {
                  e.currentTarget.style.backgroundColor = "#1f2937";
                }
              }}
            >
              <span>{option}</span>
              {icon && (
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "16px",
                    color: isCorrect ? theme.accent : "#ef4444",
                  }}
                >
                  {icon}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selectedIdx === null}
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: selectedIdx === null ? "#4b5563" : theme.primary,
            color: "#fff",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: selectedIdx === null ? "default" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          Submit Answer
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "8px",
              borderLeft: `4px solid ${selectedIdx === correctAnswer ? theme.accent : "#ef4444"}`,
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#d1d5db",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "4px",
                color: selectedIdx === correctAnswer ? theme.accent : "#fca5a5",
              }}
            >
              {selectedIdx === correctAnswer ? "Correct!" : "Incorrect"}
            </strong>
            {explanation}
          </div>
          <button
            onClick={onComplete}
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: theme.accent,
              color: "#0a0e1a",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${theme.accent}d9`)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = theme.accent)}
          >
            Continue Lesson
          </button>
        </div>
      )}
    </div>
  );
}
