import React from 'react';
import { interpolate, Easing, useCurrentFrame } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ServerRack } from '../../components/ServerRack';
import { ScalingArrow } from '../../components/ScalingArrow';
import { GlowingNode } from '../../components/GlowingNode';
import { GlassPanel } from '../../components/GlassPanel';

type NodeSpec = {
  label: string;
  color: string;
};

const columnData: {
  title: string;
  brandColor: string;
  nodes: NodeSpec[];
}[] = [
  {
    title: 'Netflix',
    brandColor: PALETTE.primary,
    nodes: [
      { label: 'Load Balancer', color: PALETTE.primary },
      { label: 'CDN', color: PALETTE.primary },
      { label: 'Cache', color: PALETTE.primary },
      { label: 'NoSQL DB', color: PALETTE.primary },
    ],
  },
  {
    title: 'Ticketmaster',
    brandColor: PALETTE.secondary,
    nodes: [
      { label: 'Queue', color: PALETTE.secondary },
      { label: 'Workers', color: PALETTE.secondary },
      { label: 'Relational DB', color: PALETTE.secondary },
    ],
  },
  {
    title: 'Eventbrite',
    brandColor: PALETTE.success,
    nodes: [
      { label: 'Versioned Seat', color: PALETTE.success },
      { label: 'Hash Ring', color: PALETTE.success },
      { label: 'DB Cluster', color: PALETTE.success },
    ],
  },
];

const MyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  const columnWidth = 200;
  const gap = 50;
  const startX = 80;
  const startY = 80;
  const nodeSize = 60;
  const verticalSpacing = 120;

  const easeInOut = (p: number) =>
    interpolate(p, [0, 1], [0, 1], {
      easing: Easing.bezier(0.45, 0, 0.55, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const columnX = (i: number) => startX + i * (columnWidth + gap);

  return (
    <div
      style={{
        position: 'relative',
        width: columnX(columnData.length - 1) + columnWidth,
        height: 500,
        backgroundColor: PALETTE.background,
      }}
    >
      {/* Vertical separators */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {columnData.map((_, i) => {
          if (i === columnData.length - 1) return null;
          const x = columnX(i) + columnWidth + gap / 2;
          return (
            <line
              key={i}
              x1={x}
              y1={20}
              x2={x}
              y2={480}
              stroke={PALETTE.muted}
              strokeWidth={1}
              opacity={easeInOut(progress)}
            />
          );
        })}
      </svg>

      {/* Columns */}
      {columnData.map((col, colIdx) => {
        const colLeft = columnX(colIdx);
        const colCenter = colLeft + columnWidth / 2;
        const glow = `0 0 ${20 + 30 * progress}px ${col.brandColor}`;
        return (
          <div key={colIdx} style={{ position: 'absolute', left: colLeft, top: startY, width: columnWidth }}>
            {/* Column title */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: 20,
                color: col.brandColor,
                fontFamily: 'Space Grotesc, sans-serif',
                fontSize: 24,
                opacity: easeInOut(progress),
              }}
            >
              {col.title}
            </div>

            {/* Nodes */}
            {col.nodes.map((node, nodeIdx) => {
              const y = nodeIdx * verticalSpacing;
              const nodeProgress = Math.min(1, (progress * 1.2 - nodeIdx * 0.15) / 0.8);
              return (
                <GlowingNode
                  key={nodeIdx}
                  color={node.color}
                  size={nodeSize}
                  pulsing={true}
                  style={{
                    position: 'absolute',
                    left: colCenter - nodeSize / 2,
                    top: y,
                    opacity: easeInOut(nodeProgress),
                    boxShadow: glow,
                  }}
                >
                  <div
                    style={{
                      color: PALETTE.text,
                      fontSize: 12,
                      textAlign: 'center',
                      lineHeight: `${nodeSize}px`,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {node.label}
                  </div>
                </GlowingNode>
              );
            })}

            {/* Arrows between nodes */}
            {col.nodes.map((_, nodeIdx) => {
              if (nodeIdx === col.nodes.length - 1) return null;
              const fromY = nodeIdx * verticalSpacing + nodeSize / 2;
              const toY = (nodeIdx + 1) * verticalSpacing + nodeSize / 2;
              const arrowProgress = Math.min(1, (progress * 1.2 - nodeIdx * 0.2) / 0.8);
              return (
                <ScalingArrow
                  key={nodeIdx}
                  from={{ x: colCenter, y: fromY }}
                  to={{ x: colCenter, y: toY }}
                  color={col.brandColor}
                  progress={arrowProgress}
                  animateFlow={true}
                  flowSpeed={2}
                  arrowHeadSize={8}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default function Scene() {
  const frame = useCurrentFrame();
  const fps = 30;
  const totalFrames = 630;
  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bullets = [
    'Netflix',
    'Ticketmaster',
    'Eventbrite',
    'Load Balancing, Caching, Distributed DBs',
  ];

  return (
    <SceneLayout
      title="Real‑World Implementations: Netflix, Ticketmaster, and Eventbrite"
      subtitle="Load Balancing, Caching, Distributed DBs"
      bullets={bullets}
      renderDiagram={(p) => <MyDiagram progress={p} />}
    />
  );
}