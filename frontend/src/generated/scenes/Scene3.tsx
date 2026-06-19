import React from 'react';
import { useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ScalingArrow } from '../../components/ScalingArrow';
import { GlowingNode } from '../../components/GlowingNode';

const DIAGRAM_WIDTH = 800;
const DIAGRAM_HEIGHT = 600;
const RING_RADIUS = 280;
const CENTER = { x: DIAGRAM_WIDTH / 2, y: DIAGRAM_HEIGHT / 2 };

const ServerNode: React.FC<{
  angleDeg: number;
  size?: number;
  label?: string;
}> = ({ angleDeg, size = 96, label }) => {
  const rad = (angleDeg * Math.PI) / 180;
  const x = CENTER.x + RING_RADIUS * Math.cos(rad) - size / 2;
  const y = CENTER.y + RING_RADIUS * Math.sin(rad) - size / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PALETTE.primary,
        boxShadow: `0 0 12px ${PALETTE.primary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: PALETTE.text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
};

const VirtualNode: React.FC<{
  parentAngleDeg: number;
  index: number;
}> = ({ parentAngleDeg, index }) => {
  // place three triangles evenly spaced around the server node
  const offsetDeg = parentAngleDeg + (index - 1) * 30; // -30, 0, +30
  const rad = (offsetDeg * Math.PI) / 180;
  const distance = 70; // distance from center of diagram
  const x =
    CENTER.x + distance * Math.cos(rad) - 10; // triangle width ~20
  const y =
    CENTER.y + distance * Math.sin(rad) - 10; // triangle height ~20

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 0,
        height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: `20px solid ${PALETTE.secondary}`,
        transform: `rotate(${offsetDeg}deg)`,
      }}
    />
  );
};

const MyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  const clientPos = { x: 80, y: CENTER.y };
  // pick the first virtual node of the right‑hand server (90°)
  const targetAngle = 90;
  const targetRad = (targetAngle * Math.PI) / 180;
  const targetDist = 70;
  const targetPos = {
    x: CENTER.x + targetDist * Math.cos(targetRad),
    y: CENTER.y + targetDist * Math.sin(targetRad),
  };

  return (
    <div
      style={{
        position: 'relative',
        width: DIAGRAM_WIDTH,
        height: DIAGRAM_HEIGHT,
        opacity: progress,
      }}
    >
      {/* Client box */}
      <div
        style={{
          position: 'absolute',
          left: clientPos.x - 60,
          top: clientPos.y - 30,
          width: 120,
          height: 60,
          borderRadius: 8,
          backgroundColor: PALETTE.codeBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: PALETTE.text,
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          boxShadow: `0 0 8px ${PALETTE.muted}`,
        }}
      >
        Client
      </div>

      {/* SVG ring and ticks */}
      <svg
        width={DIAGRAM_WIDTH}
        height={DIAGRAM_HEIGHT}
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={RING_RADIUS}
          stroke={PALETTE.primary}
          strokeWidth={4}
          fill="none"
        />
        {/* 8 tick marks */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const inner = RING_RADIUS - 10;
          const x1 = CENTER.x + inner * Math.cos(angle);
          const y1 = CENTER.y + inner * Math.sin(angle);
          const x2 = CENTER.x + RING_RADIUS * Math.cos(angle);
          const y2 = CENTER.y + RING_RADIUS * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={PALETTE.primary}
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Server nodes */}
      {[0, 90, 180, 270].map((angle) => (
        <ServerNode key={angle} angleDeg={angle} label={`S${angle / 90 + 1}`} />
      ))}

      {/* Virtual nodes */}
      {[0, 90, 180, 270].map((angle) =>
        [0, 1, 2].map((idx) => (
          <VirtualNode key={`${angle}-${idx}`} parentAngleDeg={angle} index={idx} />
        ))
      )}

      {/* Ticket (lock holder) */}
      <GlowingNode
        color={PALETTE.highlight}
        size={30}
        pulsing
        style={{
          position: 'absolute',
          left: targetPos.x - 15,
          top: targetPos.y - 15,
        }}
      />

      {/* Arrows */}
      <ScalingArrow
        from={clientPos}
        to={targetPos}
        color={PALETTE.success}
        progress={progress}
        animateFlow
        flowSpeed={2}
        arrowHeadSize={12}
        style={{}}
      />
      <ScalingArrow
        from={targetPos}
        to={clientPos}
        color={PALETTE.success}
        progress={progress}
        animateFlow
        flowSpeed={2}
        arrowHeadSize={12}
        style={{}}
      />
    </div>
  );
};

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // overall diagram progress (starts after 30 frames, lasts 150 frames)
  const diagramProgress = interpolate(
    frame,
    [30, 180],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const keyPoints = [
    'Atomicity',
    'Distributed Locks',
    'Lock Tokens',
  ];

  return (
    <SceneLayout
      title="Atomic Seat Allocation with Distributed Locks"
      subtitle="Ensuring exclusive access across a cluster"
      bullets={keyPoints}
      codeSnippet={`lock_token = acquire_lock('seat_123')\nif lock_token:\n    # modify seat allocation\n    release_lock('seat_123', lock_token)`}
      renderDiagram={(progress) => <MyDiagram progress={diagramProgress * progress} />}
    />
  );
}