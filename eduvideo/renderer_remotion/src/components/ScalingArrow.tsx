import React from "react";
import { useCurrentFrame } from "remotion";

export interface ScalingArrowProps {
  fromX: number;   // 0-100 percentage
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  progress?: number;
  animateFlow?: boolean;
  flowSpeed?: number;
  arrowHeadSize?: number;
}

// Logical canvas size — must match the coordinate space of GlowingNode/ServerRack's
// percentage positioning. We render a full-cover SVG with this viewBox so that
// (x/100)*LW in SVG space == x% of parent container. preserveAspectRatio="none"
// makes the SVG stretch to fill the panel exactly, keeping nodes and arrows aligned.
const LW = 1920;
const LH = 1080;

export const ScalingArrow: React.FC<ScalingArrowProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  color = "#38BDF8",
  progress = 1,
  animateFlow = false,
  flowSpeed = 2,
  arrowHeadSize = 10,
}) => {
  const frame = useCurrentFrame();

  // Convert percentages to logical canvas units
  const lFromX = (fromX / 100) * LW;
  const lFromY = (fromY / 100) * LH;
  const lToX   = (toX   / 100) * LW;
  const lToY   = (toY   / 100) * LH;

  const dx = lToX - lFromX;
  const dy = lToY - lFromY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const strokeDasharray = distance;
  const strokeDashoffset = distance * (1 - progress);

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Arrow head tip position
  const tipX = lFromX + dx * progress;
  const tipY = lFromY + dy * progress;

  // Flowing packets
  const packetCount = 3;
  const packets = Array.from({ length: packetCount }).map((_, i) => {
    const offset = (i / packetCount) * distance;
    const currentDistance = (frame * flowSpeed + offset) % distance;
    const t = currentDistance / distance;
    return {
      x: lFromX + dx * t,
      y: lFromY + dy * t,
      opacity: t > 0.05 && t < 0.95 ? 1 : 0,
    };
  });

  return (
    // Full-cover SVG — fills the parent PanelCell exactly.
    // viewBox="0 0 1920 1080" + preserveAspectRatio="none" means every point at
    // (x/100*1920, y/100*1080) lands at the same visual position as CSS left:x% top:y%.
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
        <filter id={`arrow-glow-${color.replace("#", "")}`}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ghost track */}
      <line
        x1={lFromX} y1={lFromY}
        x2={lToX}   y2={lToY}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.3}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        style={{ filter: `url(#arrow-glow-${color.replace("#", "")})` }}
      />

      {/* Solid lead line */}
      <line
        x1={lFromX} y1={lFromY}
        x2={tipX}   y2={tipY}
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Arrow head */}
      {progress > 0.02 && (
        <polygon
          points={`0,0 ${-arrowHeadSize * 2},-${arrowHeadSize} ${-arrowHeadSize * 2},${arrowHeadSize}`}
          fill={color}
          opacity={0.95}
          transform={`translate(${tipX},${tipY}) rotate(${angleDeg})`}
          style={{ filter: `url(#arrow-glow-${color.replace("#", "")})` }}
        />
      )}

      {/* Animated packets */}
      {animateFlow && progress > 0.95 &&
        packets.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="7"
            fill={color}
            opacity={p.opacity * 0.9}
            style={{ filter: `url(#arrow-glow-${color.replace("#", "")})` }}
          />
        ))
      }
    </svg>
  );
};
