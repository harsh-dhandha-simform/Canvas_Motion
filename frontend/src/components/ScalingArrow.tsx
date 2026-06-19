import React from "react";
import { useCurrentFrame } from "remotion";

interface ScalingArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  progress?: number; // Line draw progress: 0 to 1
  animateFlow?: boolean; // Whether to show moving data packets
  flowSpeed?: number; // Speed of packets
  arrowHeadSize?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const ScalingArrow: React.FC<ScalingArrowProps> = ({
  from,
  to,
  color = "#38BDF8",
  progress = 1,
  animateFlow = false,
  flowSpeed = 2,
  arrowHeadSize = 8,
  style,
  className,
}) => {
  const frame = useCurrentFrame();

  // Bounding box dimensions
  const minX = Math.min(from.x, to.x) - 40;
  const minY = Math.min(from.y, to.y) - 40;
  const maxX = Math.max(from.x, to.x) + 40;
  const maxY = Math.max(from.y, to.y) + 40;
  const width = maxX - minX;
  const height = maxY - minY;

  // Relative coordinates inside the SVG
  const relFrom = { x: from.x - minX, y: from.y - minY };
  const relTo = { x: to.x - minX, y: to.y - minY };

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
        ...style,
      }}
      className={className}
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
