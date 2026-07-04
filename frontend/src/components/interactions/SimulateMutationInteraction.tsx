import { useState } from "react";
import { useTheme } from "../../ThemeContext";

interface SimulateMutationInteractionProps {
  variable: string;
  oldValue: any;
  newValue: any;
  explanation: string;
  onComplete: () => void;
}

export default function SimulateMutationInteraction({
  variable,
  oldValue,
  newValue,
  explanation,
  onComplete,
}: SimulateMutationInteractionProps) {
  const theme = useTheme();
  const [mutated, setMutated] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleMutate = () => {
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setMutated(true);
    }, 1000);
  };

  const formatJSON = (val: any) => {
    if (val === null || val === undefined) return "null";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
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
          backgroundColor: `${theme.secondary}26`,
          border: `1px solid ${theme.secondary}4d`,
          borderRadius: "4px",
          alignSelf: "flex-start",
          fontSize: "12px",
          fontWeight: "600",
          color: theme.secondary,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        State Mutation
      </div>

      <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>
        State Mutation Simulator
      </h3>

      <p style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 10px 0", lineHeight: "1.4" }}>
        {explanation}
      </p>

      {/* State display boxes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: theme.secondary, display: "block", marginBottom: "6px" }}>
            Variable:{" "}
            <code style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px" }}>
              {variable}
            </code>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Old State */}
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "bold", textTransform: "uppercase" }}>
              Before
            </span>
            <pre
              style={{
                margin: 0,
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#fca5a5",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                maxHeight: "120px",
              }}
            >
              {formatJSON(oldValue)}
            </pre>
          </div>

          {/* New State */}
          <div
            style={{
              backgroundColor: "#111827",
              border: mutated ? `1px solid ${theme.accent}` : "1px solid #1f2937",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              transform: animating ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s ease",
              opacity: mutated || animating ? 1 : 0.4,
            }}
          >
            <span style={{ fontSize: "11px", color: mutated ? theme.accent : "#9ca3af", fontWeight: "bold", textTransform: "uppercase" }}>
              {mutated ? "After (Mutated)" : "Pending"}
            </span>
            <pre
              style={{
                margin: 0,
                fontSize: "12px",
                fontFamily: "monospace",
                color: mutated ? theme.accent : "#d1d5db",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                maxHeight: "120px",
              }}
            >
              {mutated ? formatJSON(newValue) : "???"}
            </pre>
          </div>
        </div>
      </div>

      {!mutated ? (
        <button
          onClick={handleMutate}
          disabled={animating}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: animating ? "#4b5563" : theme.secondary,
            color: "#0a0e1a",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: animating ? "default" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {animating ? "Mutating State..." : "Trigger State Change"}
        </button>
      ) : (
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
      )}
    </div>
  );
}
