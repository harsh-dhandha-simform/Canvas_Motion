import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

export const StatCalloutSchema = z.object({
  title: z.string(),
  value: z.number(),
  suffix: z.string().optional(),
  description: z.string().optional(),
  accentColor: z.string().optional(),
});

interface StatCalloutProps {
  title: string;
  value: number;
  suffix?: string;
  description?: string;
  accentColor?: string;
}

export const StatCallout: React.FC<StatCalloutProps> = ({
  title,
  value,
  suffix = "",
  description,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 20], [30, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const animatedValue = interpolate(frame, [10, 60], [0, value], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div 
      className="flex flex-col h-full w-full items-center justify-center p-16"
      style={{ opacity, transform: `translateY(${translateY}px)` }}
    >
      <div 
        className="flex flex-col items-center justify-center p-16 rounded-3xl border-2 bg-slate-950/80 backdrop-blur-lg w-full max-w-4xl text-center"
        style={{
          boxShadow: `0 30px 60px -15px rgba(15, 23, 42, 0.8), 0 0 40px -10px ${accentColor}33`,
          borderColor: `${accentColor}44`,
        }}
      >
        <h2 className="text-3xl font-bold text-slate-400 mb-8 tracking-widest uppercase">
          {title}
        </h2>
        <div 
          className="text-8xl md:text-9xl font-black mb-8 tabular-nums drop-shadow-2xl"
          style={{ color: accentColor, textShadow: `0 0 30px ${accentColor}88` }}
        >
          {Math.floor(animatedValue).toLocaleString()}{suffix}
        </div>
        {description && (
          <p className="text-2xl text-slate-300 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
