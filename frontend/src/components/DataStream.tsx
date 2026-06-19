import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PALETTE } from '../generated/Palette';

export const DataStream: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  particleCount?: number;
}> = ({ from, to, color = PALETTE.secondary, particleCount = 3 }) => {
  const frame = useCurrentFrame();

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Angle for rotation
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div style={{
      position: 'absolute',
      left: from.x,
      top: from.y,
      width: length,
      height: 2,
      transformOrigin: '0% 50%',
      transform: `rotate(${angle}deg)`,
      pointerEvents: 'none',
    }}>
      {/* Background track line */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: color,
        opacity: 0.2,
      }} />

      {/* Particles */}
      {Array.from({ length: particleCount }).map((_, i) => {
        // Offset each particle's animation phase
        const phaseOffset = (i / particleCount) * 100; // 100 frames loop cycle
        
        // Loop the particle from 0 to width over 100 frames
        const xPos = ((frame + phaseOffset) % 100) / 100 * length;
        
        // Fade out at ends
        const opacity = interpolate(((frame + phaseOffset) % 100), [0, 20, 80, 100], [0, 1, 1, 0]);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: xPos,
            top: -3,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
            opacity,
          }} />
        );
      })}
    </div>
  );
};
