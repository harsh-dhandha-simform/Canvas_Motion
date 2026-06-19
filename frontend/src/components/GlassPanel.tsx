import React from 'react';
import { PALETTE } from '../generated/Palette';

export const GlassPanel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(30, 41, 59, 0.4)', // codeBg but transparent
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid rgba(255,255,255,0.1)`,
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      ...style
    }}>
      {children}
    </div>
  );
};
