import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

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

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  pros,
  cons,
  accentColor = "#38BDF8",
  visibleCount = 99,
  style,
  className,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        boxShadow: `0 30px 60px -15px rgba(15, 23, 42, 0.8), 0 0 20px -5px ${accentColor}1A`,
        borderColor: `${accentColor}33`,
        ...style,
      }}
      className={`w-[500px] h-[550px] rounded-3xl border-2 bg-slate-950/80 backdrop-blur-lg p-8 flex flex-col justify-start overflow-hidden select-none ${className || ""}`}
    >
      {/* Title */}
      <h2
        style={{
          borderBottomColor: `${accentColor}22`,
        }}
        className="text-2xl font-black text-white pb-4 mb-6 tracking-tight flex items-center gap-3 border-b-2"
      >
        <div
          style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
          className="w-3.5 h-3.5 rounded-full"
        />
        {title}
      </h2>

      {/* Grid for Pros and Cons */}
      <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
        {/* Pros */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-black tracking-widest text-emerald-400 uppercase font-mono mb-1">
            Advantages (Pros)
          </span>
          <ul className="flex flex-col gap-2.5">
            {pros.map((pro, index) => {
              const isVisible = index < visibleCount;
              const itemFrame = frame - index * 6; // stagger entry
              const itemOpacity = isVisible
                ? interpolate(itemFrame, [0, 15], [0, 1], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;
              const itemTranslateX = isVisible
                ? interpolate(itemFrame, [0, 15], [-20, 0], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;

              return (
                <li
                  key={index}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateX(${itemTranslateX}px)`,
                  }}
                  className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-200"
                >
                  <svg
                    className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{pro}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Cons */}
        <div className="flex flex-col gap-3 border-t border-slate-900 pt-5">
          <span className="text-[11px] font-black tracking-widest text-rose-400 uppercase font-mono mb-1">
            Limitations (Cons)
          </span>
          <ul className="flex flex-col gap-2.5">
            {cons.map((con, index) => {
              // Offset visible count index for cons to stagger after pros
              const conIndex = pros.length + index;
              const isVisible = conIndex < visibleCount;
              const itemFrame = frame - conIndex * 6;
              const itemOpacity = isVisible
                ? interpolate(itemFrame, [0, 15], [0, 1], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;
              const itemTranslateX = isVisible
                ? interpolate(itemFrame, [0, 15], [-20, 0], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;

              return (
                <li
                  key={index}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateX(${itemTranslateX}px)`,
                  }}
                  className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-200"
                >
                  <svg
                    className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{con}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
