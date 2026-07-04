import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PALETTE } from '../generated/Palette';

export interface DataStreamProps {
  fromX: number;   // 0-100 percentage
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  particleCount?: number;
}

// Same logical canvas as ScalingArrow — full-cover SVG trick keeps arrows
// and nodes in the same coordinate space regardless of panel size.
const LW = 1920;
const LH = 1080;

export const DataStream: React.FC<DataStreamProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  color = PALETTE.secondary,
  particleCount = 4,
}) => {
  const frame = useCurrentFrame();

  const lFromX = (fromX / 100) * LW;
  const lFromY = (fromY / 100) * LH;
  const lToX   = (toX   / 100) * LW;
  const lToY   = (toY   / 100) * LH;

  const dx = lToX - lFromX;
  const dy = lToY - lFromY;
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const phaseOffset = (i / particleCount) * 100;
    const t = ((frame + phaseOffset) % 100) / 100;
    const opacity = interpolate(
      (frame + phaseOffset) % 100,
      [0, 20, 80, 100],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: lFromX + dx * t,
      y: lFromY + dy * t,
      opacity,
    };
  });

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
      viewBox={`0 0 ${LW} ${LH}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={`stream-glow-${color.replace("#", "")}`}>
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track line */}
      <line
        x1={lFromX} y1={lFromY}
        x2={lToX}   y2={lToY}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.2}
      />

      {/* Streaming particles */}
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="8"
          fill={color}
          opacity={p.opacity}
          style={{ filter: `url(#stream-glow-${color.replace("#", "")})` }}
        />
      ))}
    </svg>
  );
};
