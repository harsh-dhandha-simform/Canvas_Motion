import { useState } from "react";
import { useTheme } from "../../ThemeContext";

interface SendRequestOption {
  id: string;
  label: string;
  outcome: {
    description: string;
    visualState: "success" | "error" | "timeout" | "redirect";
    responseDetail?: string;
  };
}

interface SendRequestInteractionProps {
  endpoint?: string;
  method?: string;
  explanation?: string;
  scenario?: string;
  options?: SendRequestOption[];
  onComplete: () => void;
}

export default function SendRequestInteraction({
  endpoint = "/api/v1/resource",
  method = "GET",
  explanation = "Trigger network request",
  scenario,
  options,
  onComplete,
}: SendRequestInteractionProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeOption, setActiveOption] = useState<SendRequestOption | null>(null);
  const [completedOptions, setCompletedOptions] = useState<Set<string>>(new Set());

  // Default scenario options if none provided via props
  const defaultOptions: SendRequestOption[] = [
    {
      id: "get",
      label: "Send GET request",
      outcome: {
        description: "Server found the page and returned it.",
        visualState: "success",
        responseDetail: "HTTP 200 OK — 42ms",
      },
    },
    {
      id: "post-auth",
      label: "POST with valid auth token",
      outcome: {
        description: "Server accepted the data and created a new resource.",
        visualState: "success",
        responseDetail: "HTTP 201 Created — 68ms",
      },
    },
    {
      id: "post-noauth",
      label: "POST with no auth token",
      outcome: {
        description: "Server rejected the request — authentication required.",
        visualState: "error",
        responseDetail: "HTTP 401 Unauthorized",
      },
    },
    {
      id: "timeout",
      label: "Request to overloaded server",
      outcome: {
        description: "Server did not respond within the timeout window.",
        visualState: "timeout",
        responseDetail: "Connection timeout after 30s",
      },
    },
  ];

  const resolvedOptions = options || defaultOptions;
  const resolvedScenario =
    scenario ||
    "A browser sends requests to a web server. Try different request types and see what happens.";

  const handleSend = (opt: SendRequestOption) => {
    setLoading(true);
    setActiveOption(null);

    // 1.8s mock latency for packet animation
    setTimeout(() => {
      setLoading(false);
      setActiveOption(opt);
      setCompletedOptions((prev) => {
        const next = new Set(prev);
        next.add(opt.id);
        return next;
      });
    }, 1800);
  };

  const getVisualStateColor = (state: "success" | "error" | "timeout" | "redirect") => {
    switch (state) {
      case "success":
        return theme.accent; // Greenish
      case "error":
        return "#ef4444"; // Red
      case "timeout":
        return theme.secondary; // Amber
      case "redirect":
        return theme.secondary; // Amber
      default:
        return "#9ca3af";
    }
  };

  const getVisualStateSymbol = (state: "success" | "error" | "timeout" | "redirect") => {
    switch (state) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "timeout":
        return "⏱";
      case "redirect":
        return "→";
      default:
        return "";
    }
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
        Network Sandbox
      </div>

      <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "4px 0" }}>
        Interactive Request Simulator
      </h3>

      <p style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 10px 0", lineHeight: "1.4" }}>
        {resolvedScenario}
      </p>

      {/* Dynamic Option Buttons Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {resolvedOptions.map((opt) => {
          const isSelected = activeOption?.id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSend(opt)}
              disabled={loading}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: isSelected ? `${theme.primary}22` : "#1f2937",
                border: isSelected ? `2.5px solid ${theme.primary}` : "1px solid #374151",
                color: "#fff",
                fontSize: "14px",
                cursor: loading ? "default" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                outline: "none",
                fontWeight: isSelected ? "bold" : "normal",
              }}
              onMouseOver={(e) => {
                if (!loading && !isSelected) {
                  e.currentTarget.style.backgroundColor = "#2d3748";
                }
              }}
              onMouseOut={(e) => {
                if (!loading && !isSelected) {
                  e.currentTarget.style.backgroundColor = "#1f2937";
                }
              }}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Topology Sandbox */}
      <div
        style={{
          position: "relative",
          height: "140px",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Client Node */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 2 }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "8px",
              backgroundColor: "#374151",
              border: `2px solid ${theme.primary}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "20px",
            }}
          >
            💻
          </div>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Client</span>
        </div>

        {/* Animated packet stream */}
        <div
          style={{
            position: "absolute",
            left: "30%",
            right: "30%",
            height: "4px",
            backgroundColor: "#1f2937",
            zIndex: 1,
          }}
        >
          {loading && (
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: theme.primary,
                position: "absolute",
                top: "-4px",
                boxShadow: `0 0 8px ${theme.primary}`,
                animation: "packetFlow 1.8s infinite linear",
              }}
            />
          )}
          <style>{`
            @keyframes packetFlow {
              0% { left: 0%; opacity: 1; }
              50% { left: 100%; opacity: 1; }
              51% { left: 100%; opacity: 0; }
              52% { left: 100%; opacity: 1; transform: scale(1.2); }
              100% { left: 0%; opacity: 1; }
            }
          `}</style>
        </div>

        {/* Server Node */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 2 }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "8px",
              backgroundColor: "#374151",
              border: loading
                ? `2px solid ${theme.secondary}`
                : activeOption
                ? `2px solid ${getVisualStateColor(activeOption.outcome.visualState)}`
                : "2px solid #4b5563",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "20px",
              transition: "border-color 0.3s",
              boxShadow: activeOption
                ? `0 0 10px ${getVisualStateColor(activeOption.outcome.visualState)}`
                : "none",
            }}
          >
            🛢️
          </div>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Host</span>
        </div>
      </div>

      {/* Outcome / Response detail section */}
      {activeOption && !loading && (
        <div
          style={{
            padding: "14px",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderLeft: `4px solid ${getVisualStateColor(activeOption.outcome.visualState)}`,
            borderRadius: "8px",
            fontSize: "14px",
            transition: "all 0.3s ease",
          }}
        >
          <span
            style={{
              color: getVisualStateColor(activeOption.outcome.visualState),
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "16px" }}>
              {getVisualStateSymbol(activeOption.outcome.visualState)}
            </span>
            {activeOption.outcome.responseDetail || "Response Received"}
          </span>
          {activeOption.outcome.description}
        </div>
      )}

      {/* Continue Lesson button once at least one option is tried */}
      {completedOptions.size > 0 && !loading && (
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
            marginTop: "8px",
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
