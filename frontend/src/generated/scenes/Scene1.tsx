import React from 'react';
import { useCurrentFrame, interpolate, Easing, spring } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ScalingArrow } from '../../components/ScalingArrow';
import { GlowingNode } from '../../components/GlowingNode';

const MyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  // container dimensions
  const width = 800;
  const height = 600;

  // positions
  const lb = { x: 120, y: height / 2 }; // Load Balancer
  const servers = [
    { x: 460, y: 200 },
    { x: 620, y: 200 },
    { x: 460, y: 350 },
    { x: 620, y: 350 },
  ];

  // sub‑progresses
  const lbOpacity = interpolate(progress, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' });
  const arrowsOpacity = interpolate(progress, [0.15, 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const serversOpacity = interpolate(progress, [0.3, 0.45], [0, 1], { extrapolateRight: 'clamp' });
  const seatsOpacity = interpolate(progress, [0.45, 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const ticketScale = spring({
    frame: Math.round(interpolate(progress, [0.6, 1], [0, 120])),
    fps: 30,
    from: 0.8,
    to: 1.2,
    config: { damping: 12 },
    durationInFrames: 30,
  });

  // seat matrix
  const seatRows = 10;
  const seatCols = 10;
  const seatW = 8;
  const seatH = 12;
  const seatGapX = 10;
  const seatGapY = 14;
  const seatOffsetX = 380;
  const seatOffsetY = 140;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: PALETTE.background,
      }}
    >
      {/* Load Balancer */}
      <div
        style={{
          position: 'absolute',
          left: lb.x - 100,
          top: lb.y - 40,
          width: 200,
          height: 80,
          borderRadius: 12,
          backgroundColor: PALETTE.codeBg,
          border: `2px solid ${PALETTE.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: lbOpacity,
        }}
      >
        <span style={{ color: PALETTE.primary, fontWeight: 600 }}>
          Load Balancer
        </span>
      </div>

      {/* Arrows */}
      {servers.map((srv, i) => (
        <ScalingArrow
          key={i}
          from={{ x: lb.x + 100, y: lb.y }}
          to={{ x: srv.x, y: srv.y }}
          color={PALETTE.secondary}
          progress={arrowsOpacity}
          animateFlow={false}
          style={{ position: 'absolute' }}
        />
      ))}

      {/* Server Nodes */}
      {servers.map((srv, i) => (
        <GlowingNode
          key={i}
          color={PALETTE.primary}
          size={96}
          pulsing={false}
          style={{
            position: 'absolute',
            left: srv.x - 48,
            top: srv.y - 48,
            opacity: serversOpacity,
            backgroundColor: PALETTE.codeBg,
            border: `2px solid ${PALETTE.primary}`,
            borderRadius: '50%',
          }}
        />
      ))}

      {/* Seat Matrix (behind servers) */}
      <div
        style={{
          position: 'absolute',
          left: seatOffsetX,
          top: seatOffsetY,
          opacity: seatsOpacity,
          display: 'grid',
          gridTemplateColumns: `repeat(${seatCols}, ${seatW}px)`,
          gridGap: `${seatGapY}px ${seatGapX}px`,
        }}
      >
        {Array.from({ length: seatRows * seatCols }).map((_, idx) => {
          const row = Math.floor(idx / seatCols);
          const col = idx % seatCols;
          const isSold = (row + col) % 5 === 0;
          return (
            <div
              key={idx}
              style={{
                width: seatW,
                height: seatH,
                backgroundColor: isSold ? PALETTE.danger : PALETTE.muted,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>

      {/* Ticket Icon hovering over first server */}
      <svg
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: servers[0].x - 12,
          top: servers[0].y - 36,
          width: 24,
          height: 24,
          stroke: PALETTE.highlight,
          fill: 'none',
          transform: `scale(${ticketScale})`,
          transformOrigin: 'center',
        }}
      >
        <path
          d="M2 7v10a2 2 0 0 0 2 2h4l2 2 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
};

export default function Scene() {
  const frame = useCurrentFrame();
  const fps = 30;
  const diagramProgress = interpolate(
    frame,
    [30, 150],
    [0, 1],
    { extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.55, 1) }
  );

  return (
    <SceneLayout
      mode="split"
      title="The Ticketing Nightmare: Lost Sales During Peak Demand"
      subtitle="Load‑balancer fronting a theater‑seating matrix"
      bullets={['Scalability', 'Concurrency', 'Load Balancing', 'Distributed Databases']}
      renderDiagram={(p) => <MyDiagram progress={p * diagramProgress} />}
    />
  );
}