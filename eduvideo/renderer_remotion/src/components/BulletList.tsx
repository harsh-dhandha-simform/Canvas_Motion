import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

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

export const BulletList: React.FC<BulletListProps> = ({
  title,
  items,
  accentColor = "#38BDF8",
  numbered = false,
  align = "left",
}) => {
  const frame = useCurrentFrame();

  const safeItems = items ?? [];

  return (
    <div className={`flex flex-col h-full w-full justify-center p-16 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      <h2
        className="text-5xl font-black text-white mb-12 tracking-tight flex items-center gap-4"
      >
        <div
          style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}` }}
          className="w-5 h-5 rounded-full"
        />
        {title}
      </h2>
      <ul className={`flex flex-col gap-6 w-full max-w-4xl ${align === "center" ? "items-center" : "items-start"}`}>
        {safeItems.map((item, index) => {
          const itemFrame = frame - index * 8; // stagger
          const opacity = interpolate(itemFrame, [0, 15], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateX = interpolate(itemFrame, [0, 15], [-30, 0], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <li
              key={index}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
              }}
              className="flex items-start gap-4 text-3xl leading-relaxed text-slate-200"
            >
              {numbered ? (
                <span
                  style={{ color: accentColor }}
                  className="font-black font-mono mt-1"
                >
                  {index + 1}.
                </span>
              ) : (
                <svg
                  className="w-8 h-8 shrink-0 mt-1.5"
                  style={{ color: accentColor }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
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
