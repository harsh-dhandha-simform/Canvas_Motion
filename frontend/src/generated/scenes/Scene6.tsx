import React from 'react';
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ScalingArrow } from '../../components/ScalingArrow';
import { GlowingNode } from '../../components/GlowingNode';

const DURATION = 540; // frames for this scene

const Diagram: React.FC<{ progress: number }> = ({ progress }) => {
  // Helper to get eased sub‑progress
  const sub = (start: number, end: number, ease = Easing.bezier(0.45, 0, 0.55, 1)) =>
    ease(Math.min(Math.max((progress - start) / (end - start), 0), 1));

  // Producers fade‑in (0‑0.15)
  const prodOpacity = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Belt draw (0.1‑0.3)
  const beltScale = interpolate(progress, [0.1, 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Queue appears (0.25‑0.4)
  const queueOpacity = interpolate(progress, [0.25, 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Workers appear (0.35‑0.55)
  const workersOpacity = interpolate(progress, [0.35, 0.55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Back‑pressure exclamation (0.6‑0.75)
  const exclamationOpacity = interpolate(progress, [0.6, 0.75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Valve shrink (0.6‑0.8)
  const valveScale = interpolate(progress, [0.6, 0.8], [1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  // Arrow flow progress (same as belt)
  const arrowProgress = beltScale;

  return (
    <div
      style={{
        position: 'relative',
        width: 800,
        height: 400,
        margin: 'auto',
        backgroundColor: PALETTE.background,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Producers */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 80 + i * 100,
            left: 30,
            width: 120,
            height: 60,
            borderRadius: 8,
            backgroundColor: PALETTE.primary,
            opacity: prodOpacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: PALETTE.text,
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
          }}
        >
          Producer {i + 1}
        </div>
      ))}

      {/* Belt */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 170,
          width: 600 * beltScale,
          height: 40,
          backgroundColor: '#2a2e3d',
          borderRadius: 20,
          transformOrigin: 'left center',
        }}
      />

      {/* Valve (blue) on belt */}
      <div
        style={{
          position: 'absolute',
          top: 190,
          left: 350,
          width: 30,
          height: 60,
          backgroundColor: PALETTE.secondary,
          borderRadius: 6,
          transform: `scaleY(${valveScale})`,
          transformOrigin: 'center center',
          opacity: beltScale,
        }}
      />

      {/* Queue cylinder */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 500,
          width: 100,
          height: 100,
          backgroundColor: PALETTE.codeBg,
          borderRadius: '50% / 20%',
          opacity: queueOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.text,
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        }}
      >
        reservations
      </div>

      {/* Exclamation (back‑pressure) */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 540,
          fontSize: 32,
          color: PALETTE.danger,
          opacity: exclamationOpacity,
          fontWeight: 'bold',
        }}
      >
        !
      </div>

      {/* Workers */}
      {[0, 1, 2].map((i) => (
        <GlowingNode
          key={i}
          color={PALETTE.success}
          size={96}
          pulsing={true}
          style={{
            position: 'absolute',
            top: 80 + i * 100,
            left: 660,
            opacity: workersOpacity,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: PALETTE.text,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
            }}
          >
            Worker {i + 1}
          </div>
        </GlowingNode>
      ))}

      {/* Arrows from producers to belt */}
      {['#', '#', '#'].map((_, i) => (
        <ScalingArrow
          key={`p${i}`}
          from={{ x: 150, y: 110 + i * 100 }}
          to={{ x: 170, y: 220 }}
          color={PALETTE.primary}
          progress={arrowProgress}
          animateFlow={true}
          flowSpeed={2}
          arrowHeadSize={8}
          style={{}}
        />
      ))}

      {/* Arrow from queue to workers */}
      {[0, 1, 2].map((i) => (
        <ScalingArrow
          key={`w${i}`}
          from={{ x: 600, y: 200 }}
          to={{ x: 660, y: 110 + i * 100 }}
          color={PALETTE.success}
          progress={arrowProgress}
          animateFlow={true}
          flowSpeed={2}
          arrowHeadSize={8}
          style={{}}
        />
      ))}
    </div>
  );
};

export default function Scene6() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneLayout
      title="Queue‑Based Reservation Pipeline and Back‑Pressure"
      subtitle="Managing flow with back‑pressure"
      bullets={['Queue‑Based Pipeline', 'Back‑Pressure', 'Flow Control']}
      codeSnippet={`queue = create_queue('reservations')
while True:
    request = queue.get()
    # process request
    queue.ack(request)`}
      renderDiagram={(p) => <Diagram progress={p} />}
    />
  );
}