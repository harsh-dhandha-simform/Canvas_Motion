import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ServerRack } from '../../components/ServerRack';
import { ScalingArrow } from '../../components/ScalingArrow';

/* ---------- Helper Animated Title ---------- */
const AnimatedTitle: React.FC<{
  text: string;
  from: number;
  duration: number;
  style?: React.CSSProperties;
}> = ({ text, from, duration, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [from, from + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const translateY = interpolate(
    frame,
    [from, from + duration],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <h1
      style={{
        color: PALETTE.primary,
        fontSize: 64,
        margin: 0,
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {text}
    </h1>
  );
};

/* ---------- Diagram Component ---------- */
const IdempotencyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  // Normalized progress for each segment
  const stage = (p: number, start: number, end: number) =>
    Math.min(Math.max((p - start) / (end - start), 0), 1);

  const clientOpacity = stage(progress, 0, 0.15);
  const gatewayOpacity = stage(progress, 0.15, 0.3);
  const decisionOpacity = stage(progress, 0.3, 0.45);
  const createOpacity = stage(progress, 0.45, 0.6);
  const returnOpacity = stage(progress, 0.45, 0.6);
  const badgePulse = Math.abs(Math.sin(progress * Math.PI * 4)); // 2 full pulses

  const badgeScale = interpolate(badgePulse, [0, 1], [0.9, 1.2]);

  // Positions
  const client = { x: 60, y: 200, w: 150, h: 80 };
  const gateway = { x: 300, y: 180, w: 180, h: 100 };
  const decision = { cx: gateway.x + gateway.w / 2, cy: gateway.y + gateway.h + 60, size: 60 };
  const createRes = { x: gateway.x, y: decision.cy + 80, w: 180, h: 80 };
  const returnRes = { x: gateway.x + 260, y: decision.cy + 80, w: 180, h: 80 };

  // Arrow progress helpers
  const arrowProgress = (start: number, end: number) => stage(progress, start, end);

  return (
    <div style={{ position: 'relative', width: 800, height: 500 }}>
      {/* SVG container for lines and arrows */}
      <svg
        width={800}
        height={500}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        {/* Client → Gateway */}
        <ScalingArrow
          from={{ x: client.x + client.w, y: client.y + client.h / 2 }}
          to={{ x: gateway.x, y: gateway.y + gateway.h / 2 }}
          color={PALETTE.secondary}
          progress={arrowProgress(0.15, 0.25)}
          animateFlow={false}
        />
        {/* Gateway → Decision */}
        <ScalingArrow
          from={{ x: gateway.x + gateway.w / 2, y: gateway.y + gateway.h }}
          to={{ x: decision.cx, y: decision.cy - decision.size / 2 }}
          color={PALETTE.secondary}
          progress={arrowProgress(0.25, 0.35)}
          animateFlow={false}
        />
        {/* Decision → Create (green) */}
        <ScalingArrow
          from={{ x: decision.cx, y: decision.cy + decision.size / 2 }}
          to={{ x: createRes.x + createRes.w / 2, y: createRes.y }}
          color={PALETTE.success}
          progress={arrowProgress(0.45, 0.55)}
          animateFlow={true}
          flowSpeed={2}
        />
        {/* Decision → Return (blue) */}
        <ScalingArrow
          from={{ x: decision.cx, y: decision.cy + decision.size / 2 }}
          to={{ x: returnRes.x + returnRes.w / 2, y: returnRes.y }}
          color={PALETTE.primary}
          progress={arrowProgress(0.45, 0.55)}
          animateFlow={true}
          flowSpeed={2}
        />
      </svg>

      {/* Client Box */}
      <div
        style={{
          position: 'absolute',
          left: client.x,
          top: client.y,
          width: client.w,
          height: client.h,
          backgroundColor: PALETTE.primary,
          borderRadius: 12,
          opacity: clientOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.text,
          fontSize: 18,
        }}
      >
        Client
        {/* Idempotency Key Badge */}
        <div
          style={{
            position: 'absolute',
            right: -12,
            top: -12,
            width: 24,
            height: 24,
            backgroundColor: PALETTE.highlight,
            borderRadius: '50%',
            border: `2px solid ${PALETTE.background}`,
            transform: `scale(${badgeScale})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: PALETTE.background,
          }}
        >
          K
        </div>
      </div>

      {/* API Gateway */}
      <div
        style={{
          position: 'absolute',
          left: gateway.x,
          top: gateway.y,
          width: gateway.w,
          height: gateway.h,
          backgroundColor: '#2a2e3d',
          borderRadius: 8,
          opacity: gatewayOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.text,
          fontSize: 16,
        }}
      >
        API Gateway
      </div>

      {/* Decision Diamond */}
      <div
        style={{
          position: 'absolute',
          left: decision.cx - decision.size / 2,
          top: decision.cy - decision.size / 2,
          width: decision.size,
          height: decision.size,
          backgroundColor: 'transparent',
          border: `2px solid ${PALETTE.primary}`,
          transform: 'rotate(45deg)',
          opacity: decisionOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: decision.cx - 40,
          top: decision.cy - 10,
          color: PALETTE.text,
          fontSize: 14,
          opacity: decisionOpacity,
        }}
      >
        Key Seen?
      </div>

      {/* Create Reservation */}
      <div
        style={{
          position: 'absolute',
          left: createRes.x,
          top: createRes.y,
          width: createRes.w,
          height: createRes.h,
          backgroundColor: PALETTE.success,
          borderRadius: 8,
          opacity: createOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.background,
          fontSize: 15,
        }}
      >
        Create Reservation
      </div>

      {/* Return Existing Reservation */}
      <div
        style={{
          position: 'absolute',
          left: returnRes.x,
          top: returnRes.y,
          width: returnRes.w,
          height: returnRes.h,
          backgroundColor: PALETTE.primary,
          borderRadius: 8,
          opacity: returnOpacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.text,
          fontSize: 15,
        }}
      >
        Return Existing
      </div>

      {/* Optional Server Rack representing backend storage */}
      <div style={{ position: 'absolute', left: 560, top: 120 }}>
        <ServerRack
          scale={0.6}
          label="DB"
          isActive={progress > 0.5}
          color={PALETTE.muted}
        />
      </div>
    </div>
  );
};

/* ---------- Main Scene Component ---------- */
export default function Scene7() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = 630; // from scene_timing
  const diagramProgress = interpolate(
    frame,
    [0, totalFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Bullet points
  const bullets = [
    'Idempotent API',
    'Idempotency Keys',
    'Token‑Based Idempotence',
  ];

  return (
    <SceneLayout
      mode="split"
      title="Idempotent Reservation API and Idempotency Keys"
      subtitle="Safe retries with unique keys"
      bullets={bullets}
      codeSnippet={`idempotency_key = generate_idempotency_key()\nrequest = create_request('reservation', idempotency_key)\n# send request`}
      renderDiagram={(prog) => <IdempotencyDiagram progress={diagramProgress} />}
    />
  );
}