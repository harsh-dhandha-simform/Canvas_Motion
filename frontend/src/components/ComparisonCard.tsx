import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";
import { usePanelSize } from "../PanelSizeContext";

export const ComparisonCardSchema = z.object({
  title: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  accentColor: z.string().optional(),
  visibleCount: z.number().optional(),
});

interface ComparisonCardProps {
  title: string;
  pros: string[];
  cons: string[];
  accentColor?: string;
  visibleCount?: number; // Count of items to show, allowing staggered reveal
  style?: React.CSSProperties;
  className?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  pros,
  cons,
  accentColor = "#38BDF8",
  visibleCount = 99,
  style,
}) => {
  const frame = useCurrentFrame();
  const { height: ch } = usePanelSize();

  const safePros = pros ?? [];
  const safeCons = cons ?? [];
  const total = safePros.length + safeCons.length;

  // Fill the cell and scale type so every item fits the available height — no
  // scrollbar, no cropping. Denser lists shrink the font; sparse ones keep it big.
  const pad = clamp(Math.round(ch * 0.045), 18, 44);
  const chrome = pad * 2 + ch * 0.13 /*title*/ + ch * 0.1 /*2 section labels*/ + ch * 0.04 /*gaps/divider*/;
  const perItem = (ch - chrome) / Math.max(1, total);
  const itemFont = clamp(perItem * 0.4, 13, 24);
  const itemGap = clamp(itemFont * 0.5, 5, 14);
  const titleFont = clamp(itemFont * 1.5, 22, 34);
  const labelFont = clamp(itemFont * 0.62, 11, 16);
  const iconSz = Math.round(itemFont * 1.15);

  const renderItem = (text: string, globalIndex: number, kind: "pro" | "con") => {
    const isVisible = globalIndex < visibleCount;
    const itemFrame = frame - globalIndex * 6;
    const o = isVisible
      ? interpolate(itemFrame, [0, 15], [0, 1], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;
    const tx = isVisible
      ? interpolate(itemFrame, [0, 15], [-20, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;
    return (
      <li
        key={`${kind}-${globalIndex}`}
        style={{
          opacity: o,
          transform: `translateX(${tx}px)`,
          display: "flex",
          alignItems: "flex-start",
          gap: Math.round(itemFont * 0.6),
          fontSize: itemFont,
          lineHeight: 1.35,
          color: "#e2e8f0",
        }}
      >
        <svg
          width={iconSz}
          height={iconSz}
          style={{ flexShrink: 0, marginTop: 2, color: kind === "pro" ? "#34d399" : "#fb7185" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={kind === "pro" ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
        </svg>
        <span>{text}</span>
      </li>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: pad,
        borderRadius: clamp(Math.round(ch * 0.03), 16, 28),
        border: `2px solid ${accentColor}33`,
        background: "rgba(2, 6, 23, 0.82)",
        backdropFilter: "blur(12px)",
        boxShadow: `0 30px 60px -15px rgba(15, 23, 42, 0.8), 0 0 20px -5px ${accentColor}1A`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Title */}
      <h2
        style={{
          margin: 0,
          fontSize: titleFont,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: pad * 0.4,
          marginBottom: pad * 0.5,
          borderBottom: `2px solid ${accentColor}22`,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 999, flexShrink: 0, background: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
        {title}
      </h2>

      {/* Pros + Cons */}
      <div style={{ display: "flex", flexDirection: "column", gap: itemGap * 1.6, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
          <span style={{ fontSize: labelFont, fontWeight: 900, letterSpacing: "0.18em", color: "#34d399", textTransform: "uppercase", fontFamily: "monospace" }}>
            Advantages (Pros)
          </span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: itemGap }}>
            {safePros.map((p, i) => renderItem(p, i, "pro"))}
          </ul>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: itemGap, borderTop: "1px solid #1e293b", paddingTop: itemGap * 1.4 }}>
          <span style={{ fontSize: labelFont, fontWeight: 900, letterSpacing: "0.18em", color: "#fb7185", textTransform: "uppercase", fontFamily: "monospace" }}>
            Limitations (Cons)
          </span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: itemGap }}>
            {safeCons.map((c, i) => renderItem(c, safePros.length + i, "con"))}
          </ul>
        </div>
      </div>
    </div>
  );
};
