import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AnimatedTitle } from './AnimatedTitle';
import { PALETTE } from '../generated/Palette';

export interface SceneLayoutProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  bullets?: string[];
  codeSnippet?: string;
  mode?: "split" | "fullscreen-diagram" | "center-focus";
  renderDiagram: (progress: number) => React.ReactNode;
}

export const SceneLayout: React.FC<SceneLayoutProps> = ({
  title,
  subtitle,
  accentColor = PALETTE.primary,
  bullets = [],
  codeSnippet,
  mode = "split",
  renderDiagram,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- SPRING PHYSICS ---
  // Header bounces in
  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 120 },
    durationInFrames: 30,
  });

  // Left panel slides up with bounce
  const leftPanelSpring = spring({
    frame: frame - 15, // Delay 15 frames
    fps,
    config: { damping: 12, mass: 1 },
    durationInFrames: 30,
  });

  // Bullets stagger
  const bulletSprings = bullets.map((_, i) =>
    spring({
      frame: frame - (30 + i * 8), // Stagger 8 frames each
      fps,
      config: { damping: 12, stiffness: 150 },
      durationInFrames: 25,
    })
  );

  // Code block
  const codeSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14 },
    durationInFrames: 30,
  });

  // Diagram progress (a smoother spring for drawing elements)
  const diagramProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200, mass: 2 }, // Heavy, slow spring
    durationInFrames: 120, // Takes a while to finish drawing
  });

  const headerY = interpolate(headerSpring, [0, 1], [-50, 0]);
  const leftY = interpolate(leftPanelSpring, [0, 1], [50, 0]);

  // Layout calculations based on mode
  const showLeftPanel = mode === "split" && (bullets.length > 0 || codeSnippet);
  
  // Right panel width based on mode
  let diagramStyle: React.CSSProperties = {
    position: 'absolute',
    top: 150,
    bottom: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (mode === "fullscreen-diagram") {
    diagramStyle = { ...diagramStyle, left: 40, right: 40, top: 40, bottom: 40 }; // Takes full screen
  } else if (mode === "center-focus") {
    diagramStyle = { ...diagramStyle, left: 200, right: 200, top: 200, bottom: 200 }; // Centered block
  } else {
    // split
    diagramStyle = { ...diagramStyle, left: 760, right: 40 }; // Fits on right side
  }

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.background }}>
      {/* Header (Hidden if fullscreen) */}
      {mode !== "fullscreen-diagram" && (
        <div style={{ 
          position: 'absolute', 
          top: 40, left: 60, right: 60, 
          opacity: headerSpring,
          transform: `translateY(${headerY}px)`
        }}>
          <AnimatedTitle
            title={title}
            subtitle={subtitle}
            accentColor={accentColor}
            align={mode === "center-focus" ? "center" : "left"}
          />
        </div>
      )}

      {/* Left panel (Bullets & Code) */}
      {showLeftPanel && (
        <div
          style={{
            position: 'absolute',
            top: 160,
            left: 60,
            width: 660,
            bottom: 60,
            opacity: leftPanelSpring,
            transform: `translateY(${leftY}px)`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bullets.map((point, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 14, 
                opacity: bulletSprings[i],
                transform: `translateX(${interpolate(bulletSprings[i], [0, 1], [-20, 0])}px)`
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: accentColor,
                  marginTop: 7, flexShrink: 0,
                  boxShadow: `0 0 12px ${accentColor}`,
                }} />
                <span style={{ color: PALETTE.text, fontSize: 21, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                  {point}
                </span>
              </div>
            ))}
          </div>

          {codeSnippet && (
            <pre style={{
              marginTop: 32,
              padding: '20px 24px',
              backgroundColor: PALETTE.codeBg,
              borderRadius: 12,
              borderLeft: `4px solid ${accentColor}`,
              color: PALETTE.text,
              fontSize: 14,
              fontFamily: 'Fira Code, monospace',
              lineHeight: 1.6,
              opacity: codeSpring,
              transform: `scale(${interpolate(codeSpring, [0, 1], [0.95, 1])})`,
              boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
              overflow: 'hidden',
            }}>
              {codeSnippet}
            </pre>
          )}
        </div>
      )}

      {/* Diagram Panel */}
      <div style={diagramStyle}>
        {renderDiagram(diagramProgress)}
      </div>
    </AbsoluteFill>
  );
};
