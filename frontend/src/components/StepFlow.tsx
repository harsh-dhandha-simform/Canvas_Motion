import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { z } from "zod";

export const StepFlowSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  accentColor: z.string().optional(),
});

interface StepFlowProps {
  title: string;
  steps: string[];
  accentColor?: string;
}

export const StepFlow: React.FC<StepFlowProps> = ({
  title,
  steps,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-16">
      <h2 className="text-5xl font-black text-white mb-16 tracking-tight text-center">
        {title}
      </h2>
      <div className="flex flex-row justify-between w-full max-w-5xl items-center relative">
        {/* Connector Line Base */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 -z-10" />
        
        {/* Connector Line Animated */}
        <div 
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 -z-10"
          style={{
            backgroundColor: accentColor,
            width: `${interpolate(frame, [10, 60], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}%`,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />

        {steps.map((step, index) => {
          const itemFrame = frame - index * 15;
          const opacity = interpolate(itemFrame, [0, 15], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = interpolate(itemFrame, [0, 15], [0.5, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `scale(${scale})`,
              }}
              className="flex flex-col items-center gap-4 w-48 text-center"
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-slate-900 bg-white border-4"
                style={{ borderColor: accentColor, boxShadow: `0 0 20px ${accentColor}88` }}
              >
                {index + 1}
              </div>
              <span className="text-xl font-bold text-slate-200">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
