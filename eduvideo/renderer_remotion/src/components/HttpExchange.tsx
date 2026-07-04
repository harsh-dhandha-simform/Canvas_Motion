/**
 * HttpExchange — side-by-side HTTP request/response viewer with animated reveal.
 * Mimics browser DevTools "Headers" panel with line-by-line staggered animation.
 */
import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

export const HttpExchangeSchema = z.object({
  title: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
  path: z.string(),
  host: z.string().optional(),
  requestHeaders: z.record(z.string(), z.string()).optional(),
  requestBody: z.string().optional(),
  statusCode: z.number().optional(),
  statusText: z.string().optional(),
  responseHeaders: z.record(z.string(), z.string()).optional(),
  responseBody: z.string().optional(),
});

export type HttpExchangeProps = z.infer<typeof HttpExchangeSchema>;

const METHOD_COLOR: Record<string, string> = {
  GET: "#10b981",
  POST: "#6366f1",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
  PATCH: "#8b5cf6",
};

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "#10b981";
  if (code >= 300 && code < 400) return "#f59e0b";
  if (code >= 400 && code < 500) return "#ef4444";
  return "#dc2626";
}

function tokenizeLine(line: string, isFirst: boolean, isResponse: boolean): React.ReactNode {
  if (isFirst) return <span style={{ fontWeight: 800 }}>{line}</span>;

  // Blank separator
  if (line.trim() === "") return <span>&nbsp;</span>;

  // Header line: "Key: Value"
  const colonIdx = line.indexOf(": ");
  if (colonIdx > 0 && !line.startsWith("{") && !line.startsWith("[") && !line.startsWith(" ")) {
    const key = line.slice(0, colonIdx + 1);
    const val = line.slice(colonIdx + 1);
    return (
      <>
        <span style={{ color: "#94a3b8" }}>{key}</span>
        <span style={{ color: "#e2e8f0" }}>{val}</span>
      </>
    );
  }

  // JSON body (indented or starts with { / [)
  if (line.startsWith(" ") || line.startsWith("{") || line.startsWith("[") || line.startsWith("}") || line.startsWith("]")) {
    // Simple JSON colorizer
    return <span style={{ color: "#7dd3fc" }}>{line}</span>;
  }

  return <span>{line}</span>;
}

interface PanelProps {
  lines: string[];
  reveal: number;
  badgeLabel: string;
  badgeColor: string;
  glowColor: string;
  isResponse: boolean;
}

const Panel: React.FC<PanelProps> = ({ lines, reveal, badgeLabel, badgeColor, glowColor, isResponse }) => (
  <div
    style={{
      flex: 1,
      background: "#0a0f1e",
      border: `2px solid ${glowColor}40`,
      borderRadius: 18,
      padding: "28px 32px",
      boxShadow: `0 0 50px ${glowColor}18, inset 0 1px 0 ${glowColor}20`,
      opacity: reveal,
      transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
      display: "flex",
      flexDirection: "column",
      gap: 0,
      overflow: "hidden",
    }}
  >
    {/* Panel header badge */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <span
        style={{
          background: `${badgeColor}20`,
          color: badgeColor,
          padding: "5px 18px",
          borderRadius: 8,
          fontSize: 18,
          fontWeight: 800,
          border: `1.5px solid ${badgeColor}50`,
          fontFamily: "'Fira Code', monospace",
          letterSpacing: "0.05em",
        }}
      >
        {badgeLabel}
      </span>
    </div>

    {/* Divider */}
    <div style={{ height: 1, background: `${glowColor}20`, marginBottom: 20 }} />

    {/* Lines */}
    <div style={{ fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 21, lineHeight: 1.75 }}>
      {lines.map((line, idx) => {
        const lineDelay = idx * 0.06;
        const lineReveal = interpolate(reveal, [lineDelay, lineDelay + 0.18], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={idx}
            style={{
              opacity: lineReveal,
              transform: `translateX(${interpolate(lineReveal, [0, 1], [18, 0])}px)`,
              whiteSpace: "pre",
              color: "#e2e8f0",
              minHeight: line.trim() === "" ? 12 : undefined,
            }}
          >
            {tokenizeLine(line, idx === 0, isResponse)}
          </div>
        );
      })}
    </div>
  </div>
);

export const HttpExchange: React.FC<HttpExchangeProps> = ({
  title,
  method: methodProp,
  path,
  host = "api.example.com",
  requestHeaders = {},
  requestBody,
  statusCode: statusCodeProp,
  statusText,
  responseHeaders = {},
  responseBody,
}) => {
  const method = methodProp ?? "GET";
  const statusCode = statusCodeProp ?? 200;
  const frame = useCurrentFrame();

  const mc = METHOD_COLOR[method] || "#6366f1";
  const sc = statusColor(statusCode);
  const resolvedStatusText = statusText ?? (statusCode === 200 ? "OK" : statusCode === 201 ? "Created" : statusCode === 404 ? "Not Found" : "Error");

  const requestReveal = interpolate(frame, [8, 45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowReveal = interpolate(frame, [42, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const responseReveal = interpolate(frame, [55, 92], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Build line arrays
  const reqLines = [
    `${method} ${path} HTTP/1.1`,
    `Host: ${host}`,
    ...Object.entries(requestHeaders).map(([k, v]) => `${k}: ${v}`),
    ...(requestBody ? ["", ...requestBody.split("\n")] : []),
  ];

  const resLines = [
    `HTTP/1.1 ${statusCode} ${resolvedStatusText}`,
    ...Object.entries(responseHeaders).map(([k, v]) => `${k}: ${v}`),
    ...(responseBody ? ["", ...responseBody.split("\n")] : []),
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 60px",
        boxSizing: "border-box",
        gap: 32,
      }}
    >
      {title && (
        <h2
          style={{
            color: "#f1f5f9",
            fontSize: 52,
            fontWeight: 800,
            margin: 0,
            textAlign: "center",
            letterSpacing: "-0.02em",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h2>
      )}

      <div style={{ flex: 1, display: "flex", gap: 28, alignItems: "stretch", minHeight: 0 }}>
        <Panel
          lines={reqLines}
          reveal={requestReveal}
          badgeLabel={method}
          badgeColor={mc}
          glowColor={mc}
          isResponse={false}
        />

        {/* Center arrow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            opacity: arrowReveal,
            flexShrink: 0,
            width: 56,
          }}
        >
          <span style={{ color: "#22d3ee", fontSize: 40, lineHeight: 1 }}>→</span>
          <div style={{ width: 2, height: 32, background: "#1e293b" }} />
          <span style={{ color: "#22d3ee", fontSize: 40, lineHeight: 1, transform: "scaleX(-1)" }}>→</span>
        </div>

        <Panel
          lines={resLines}
          reveal={responseReveal}
          badgeLabel={`${statusCode} ${resolvedStatusText}`}
          badgeColor={sc}
          glowColor={sc}
          isResponse
        />
      </div>
    </div>
  );
};
