import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { PALETTE } from '../generated/Palette';

export const GlowingNode: React.FC<{ 
  color?: string; 
  size?: number; 
  pulsing?: boolean; 
  children?: React.ReactNode; 
  style?: React.CSSProperties;
}> = ({ color = PALETTE.primary, size = 100, pulsing = true, children, style }) => {
  const frame = useCurrentFrame();
  
  // Sine wave for pulsing glow
  const glowIntensity = pulsing ? interpolate(Math.sin(frame / 10), [-1, 1], [0.4, 0.8]) : 0.5;
  const shadowSpread = pulsing ? interpolate(Math.sin(frame / 10), [-1, 1], [10, 25]) : 15;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '25%', // Squircle
      backgroundColor: 'rgba(30, 41, 59, 0.9)', // Dark base
      border: `2px solid ${color}`,
      boxShadow: `0 0 ${shadowSpread}px rgba(${hexToRgb(color)}, ${glowIntensity}), inset 0 0 10px rgba(${hexToRgb(color)}, 0.3)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      ...style
    }}>
      {children}
    </div>
  );
};

// Helper for boxShadow RGBA
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '124, 58, 237';
}
