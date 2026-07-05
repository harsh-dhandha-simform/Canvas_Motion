import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";
import { usePanelSize } from "../PanelSizeContext";

export const BulletListSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
  accentColor: z.string().optional(),
  numbered: z.boolean().optional(),
  align: z.enum(["left", "center"]).optional(),
});

interface BulletListProps {
  title: string;
  items: string[];
  accentColor?: string;
  numbered?: boolean;
  align?: "left" | "center";
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const BulletList: React.FC<BulletListProps> = ({
  title,
  items,
  accentColor = "#38BDF8",
  numbered = false,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { width: cw, height: ch } = usePanelSize();

  const safeItems = items ?? [];
  const n = safeItems.length;
  const isCenter = align === "center";

  // Fill the cell and size type so title + all items fit the height — never crop.
  const pad = clamp(ch * 0.06, 22, 64);
  const titleFont = clamp(ch * 0.058, 24, 50);
  const avail = ch - pad * 2 - titleFont * 1.55; // height left for items after the title
  const lineH = 1.35;
  // Width-aware fit: shrink the item font until every item — counting the lines it
  // wraps to at the cell's REAL width — fits `avail`. Guarantees nothing is cropped,
  // for any item count or text length (down to a 14px floor).
  const itemFont = (() => {
    for (let f = 30; f >= 14; f--) {
      const g = clamp(f * 0.5, 6, 24);
      const charsPerLine = Math.max(6, Math.floor((cw - pad * 2 - f * 1.7) / (f * 0.52)));
      let lines = 0;
      for (const it of safeItems) lines += Math.max(1, Math.ceil((it?.length || 1) / charsPerLine));
      if (lines * f * lineH + Math.max(0, n - 1) * g <= avail) return f;
    }
    return 14;
  })();
  const gap = clamp(itemFont * 0.5, 6, 24);
  const iconSz = Math.round(itemFont * 1.15);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: isCenter ? "center" : "flex-start",
        textAlign: isCenter ? "center" : "left",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: titleFont * 0.5,
          fontSize: titleFont,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, background: accentColor, boxShadow: `0 0 15px ${accentColor}` }} />
        {title}
      </h2>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap,
          alignItems: isCenter ? "center" : "flex-start",
        }}
      >
        {safeItems.map((item, index) => {
          const itemFrame = frame - index * 8;
          const opacity = interpolate(itemFrame, [0, 15], [0, 1], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const translateX = interpolate(itemFrame, [0, 15], [-30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <li
              key={index}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
                display: "flex",
                alignItems: "flex-start",
                gap: Math.round(itemFont * 0.55),
                fontSize: itemFont,
                lineHeight: 1.35,
                color: "#e2e8f0",
              }}
            >
              {numbered ? (
                <span style={{ color: accentColor, fontWeight: 900, fontFamily: "monospace", flexShrink: 0 }}>{index + 1}.</span>
              ) : (
                <svg width={iconSz} height={iconSz} style={{ flexShrink: 0, marginTop: itemFont * 0.12, color: accentColor }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
