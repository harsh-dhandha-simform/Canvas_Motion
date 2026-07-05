import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AnimatedTitle } from './AnimatedTitle';
import { PALETTE } from '../generated/Palette';
import { z } from 'zod';

export const SplitScreenSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  accentColor: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  codeSnippet: z.object({
    code: z.string(),
    language: z.string()
  }).optional(),
  mediaUrl: z.string().optional(),
});

export type SplitScreenProps = z.infer<typeof SplitScreenSchema>;

export const SplitScreen: React.FC<SplitScreenProps> = ({
  title,
  subtitle,
  accentColor = PALETTE.primary,
  bullets = [],
  codeSnippet,
  mediaUrl,
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

  // Media (image) pop in
  const mediaSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 12, mass: 1.2 },
    durationInFrames: 30,
  });

  const headerY = interpolate(headerSpring, [0, 1], [-50, 0]);
  const leftY = interpolate(leftPanelSpring, [0, 1], [50, 0]);
  const mediaScale = interpolate(mediaSpring, [0, 1], [0.8, 1]);

  // The right half is a media/image slot the pipeline rarely fills. When there's
  // no image, let the text + code span the full width instead of leaving it blank.
  const hasMedia = !!mediaUrl;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.background }}>
      {/* Header */}
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
          align="left"
        />
      </div>

      {/* Left panel (Bullets & Code) — full width when there's no media image. */}
      <div
        style={{
          position: 'absolute',
          top: 160,
          left: 60,
          width: hasMedia ? 660 : undefined,
          right: hasMedia ? undefined : 60,
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
              <span style={{ color: PALETTE.text, fontSize: hasMedia ? 24 : 30, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                {point}
              </span>
            </div>
          ))}
        </div>

        {codeSnippet && (
          <pre style={{
            marginTop: 32,
            padding: '20px 24px',
            backgroundColor: PALETTE.code_bg,
            borderRadius: 12,
            borderLeft: `4px solid ${accentColor}`,
            color: PALETTE.text,
            fontSize: hasMedia ? 16 : 18,
            fontFamily: 'Fira Code, monospace',
            lineHeight: 1.6,
            opacity: codeSpring,
            transform: `scale(${interpolate(codeSpring, [0, 1], [0.95, 1])})`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}>
            {codeSnippet.code}
          </pre>
        )}
      </div>

      {/* Right Media Panel */}
      <div style={{
        position: 'absolute',
        top: 150,
        bottom: 40,
        left: 760,
        right: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {mediaUrl && (
          <img 
            src={mediaUrl} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              borderRadius: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              opacity: mediaSpring,
              transform: `scale(${mediaScale})`
            }} 
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
