import React from "react";
import { useCurrentFrame } from "remotion";

export interface ScalingArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  progress?: number; // Line draw progress: 0 to 1
  animateFlow?: boolean; // Whether to show moving data packets
  flowSpeed?: number; // Speed of packets
  arrowHeadSize?: number;
}

export const ScalingArrow: React.FC<ScalingArrowProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  color = "#38BDF8",
  progress = 1,
  animateFlow = false,
  flowSpeed = 2,
  arrowHeadSize = 8,
}) => {
  const frame = useCurrentFrame();

  const pxFromX = (fromX / 100) * 1920;
  const pxFromY = (fromY / 100) * 1080;
  const pxToX = (toX / 100) * 1920;
  const pxToY = (toY / 100) * 1080;

  // Bounding box dimensions
  const minX = Math.min(pxFromX, pxToX) - 40;
  const minY = Math.min(pxFromY, pxToY) - 40;
  const maxX = Math.max(pxFromX, pxToX) + 40;
  const maxY = Math.max(pxFromY, pxToY) + 40;
  const width = maxX - minX;
  const height = maxY - minY;

  // Relative coordinates inside the SVG
  const relFrom = { x: pxFromX - minX, y: pxFromY - minY };
  const relTo = { x: pxToX - minX, y: pxToY - minY };

  // Calculate distance
  const dx = relTo.x - relFrom.x;
  const dy = relTo.y - relFrom.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Line dash calculations for draw-in transition
  const strokeDasharray = distance;
  const strokeDashoffset = distance * (1 - progress);

  // Arrow angle
  const angle = Math.atan2(dy, dx);
  const angleDeg = (angle * 180) / Math.PI;

  // Arrow head point (at progress location)
  const currentX = relFrom.x + dx * progress;
  const currentY = relFrom.y + dy * progress;

  // Flowing packets animation parameters
  const packetCount = 3;
  const packets = Array.from({ length: packetCount }).map((_, i) => {
    // Stagger packet starts using modulo arithmetic on frame
    const offset = (i / packetCount) * distance;
    const currentDistance = (frame * flowSpeed + offset) % distance;
    const packetProgress = currentDistance / distance;

    return {
      x: relFrom.x + dx * packetProgress,
      y: relFrom.y + dy * packetProgress,
      opacity: packetProgress > 0.05 && packetProgress < 0.95 ? 1 : 0, // fade at boundaries
    };
  });

  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        width,
        height,
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${color.replace("#", "")}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main connecting path */}
      <path
        d={`M ${relFrom.x} ${relFrom.y} L ${relTo.x} ${relTo.y}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.4}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        style={{
          filter: `url(#glow-${color.replace("#", "")})`,
        }}
      />

      {/* Solid lead line */}
      <path
        d={`M ${relFrom.x} ${relFrom.y} L ${currentX} ${currentY}`}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity={0.85}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />

      {/* Arrow Head (Only show if progress is notable) */}
      {progress > 0.02 && (
        <polygon
          points={`0,0 -${arrowHeadSize * 1.8},-${arrowHeadSize} -${arrowHeadSize * 1.8},${arrowHeadSize}`}
          fill={color}
          transform={`translate(${currentX}, ${currentY}) rotate(${angleDeg})`}
          style={{
            filter: `url(#glow-${color.replace("#", "")})`,
          }}
        />
      )}

      {/* Animating Data Packets (Only show when full line is drawn and flow active) */}
      {animateFlow && progress > 0.95 && (
        <>
          {packets.map((packet, index) => (
            <circle
              key={index}
              cx={packet.x}
              cy={packet.y}
              r="5"
              fill={color}
              opacity={packet.opacity * 0.9}
              style={{
                filter: `url(#glow-${color.replace("#", "")})`,
              }}
            />
          ))}
        </>
      )}
    </svg>
  );
};
