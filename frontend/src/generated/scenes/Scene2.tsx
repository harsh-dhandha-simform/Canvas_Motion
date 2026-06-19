import React from 'react';
import { interpolate, Easing } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { GlowingNode } from '../../components/GlowingNode';
import { ScalingArrow } from '../../components/ScalingArrow';

const REQUEST_COUNT = 12;
const REQUEST_SIZE = 20;
const SERVER_RADIUS = 80;
const WORKER_RADIUS = 48;
const TOPIC_WIDTH = 30;
const TOPIC_HEIGHT = 120;

const BottleneckDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  // overall fade‑in
  const containerOpacity = interpolate(progress, [0, 0.1], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // request icons appear sequentially
  const requestIcons = Array.from({ length: REQUEST_COUNT }).map((_, i) => {
    const start = 0.1 + i * 0.015;
    const end = start + 0.02;
    const opacity = interpolate(progress, [start, end], [0, 1], {
      extrapolateRight: 'clamp',
    });
    const y = 200 + i * (REQUEST_SIZE + 4);
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 200,
          top: y,
          width: REQUEST_SIZE,
          height: REQUEST_SIZE,
          backgroundColor: PALETTE.secondary,
          borderRadius: 4,
          opacity,
        }}
      />
    );
  });

  // arrows from each request to server
  const requestArrows = Array.from({ length: REQUEST_COUNT }).map((_, i) => {
    const start = 0.1 + i * 0.015;
    const end = start + 0.04;
    const arrowProgress = interpolate(progress, [start, end], [0, 1], {
      extrapolateRight: 'clamp',
    });
    const fromY = 200 + i * (REQUEST_SIZE + 4) + REQUEST_SIZE / 2;
    return (
      <ScalingArrow
        key={i}
        from={{ x: 200 + REQUEST_SIZE, y: fromY }}
        to={{ x: 400, y: 300 }}
        color={PALETTE.primary}
        progress={arrowProgress}
        animateFlow={false}
        style={{ position: 'absolute' }}
      />
    );
  });

  // server node
  const serverOpacity = interpolate(progress, [0.2, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const serverScale = interpolate(progress, [0.2, 0.3], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  // outgoing arrow to client
  const outArrowProgress = interpolate(progress, [0.35, 0.45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // client icon
  const clientOpacity = interpolate(progress, [0.45, 0.55], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'relative',
        width: 960,
        height: 540,
        opacity: containerOpacity,
      }}
    >
      {/* Request icons */}
      {requestIcons}
      {/* Request arrows */}
      {requestArrows}
      {/* Server */}
      <GlowingNode
        color={PALETTE.primary}
        size={SERVER_RADIUS * 2}
        pulsing={false}
        style={{
          position: 'absolute',
          left: 400 - SERVER_RADIUS,
          top: 300 - SERVER_RADIUS,
          opacity: serverOpacity,
          transform: `scale(${serverScale})`,
          backgroundColor: PALETTE.codeBg,
          border: `3px solid ${PALETTE.primary}`,
          borderRadius: '50%',
        }}
      />
      {/* Outgoing arrow */}
      <ScalingArrow
        from={{ x: 400 + SERVER_RADIUS, y: 300 }}
        to={{ x: 720, y: 300 }}
        color={PALETTE.primary}
        progress={outArrowProgress}
        animateFlow={false}
        style={{ position: 'absolute' }}
      />
      {/* Client icon */}
      <GlowingNode
        color={PALETTE.success}
        size={40}
        pulsing={false}
        style={{
          position: 'absolute',
          left: 720 - 20,
          top: 300 - 20,
          opacity: clientOpacity,
          backgroundColor: PALETTE.codeBg,
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

const DistributedDiagram: React.FC<{ progress: number }> = ({ progress }) => {
  // start after bottleneck (0.6)
  const start = 0.6;
  const local = Math.max(0, progress - start) / (1 - start);
  const containerOpacity = interpolate(local, [0, 0.1], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // producer box
  const producerOpacity = interpolate(local, [0.1, 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const producerScale = interpolate(local, [0.1, 0.2], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  // topic rectangle
  const topicOpacity = interpolate(local, [0.2, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // arrows
  const prodToTopicProgress = interpolate(local, [0.3, 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const topicToWorkerProgress = interpolate(local, [0.4, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // workers
  const workerOpacity = interpolate(local, [0.5, 0.6], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const workerPositions = [
    { x: 300, y: 150 },
    { x: 500, y: 150 },
    { x: 300, y: 350 },
    { x: 500, y: 350 },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: 960,
        height: 400,
        opacity: containerOpacity,
        transform: `scale(0.6)`,
        transformOrigin: 'top left',
        top: 560,
        left: 0,
      }}
    >
      {/* Producer */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 250,
          width: 120,
          height: 60,
          backgroundColor: PALETTE.primary,
          borderRadius: 8,
          opacity: producerOpacity,
          transform: `scale(${producerScale})`,
        }}
      />
      {/* Topic */}
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 250 - TOPIC_HEIGHT / 2,
          width: TOPIC_WIDTH,
          height: TOPIC_HEIGHT,
          backgroundColor: PALETTE.muted,
          opacity: topicOpacity,
        }}
      />
      {/* Arrow producer -> topic */}
      <ScalingArrow
        from={{ x: 220, y: 280 }}
        to={{ x: 260, y: 280 }}
        color={PALETTE.highlight}
        progress={prodToTopicProgress}
        animateFlow={true}
        flowSpeed={2}
        style={{ position: 'absolute' }}
      />
      {/* Arrows topic -> workers */}
      {workerPositions.map((pos, i) => (
        <ScalingArrow
          key={i}
          from={{ x: 290, y: 280 }}
          to={{ x: pos.x, y: pos.y }}
          color={PALETTE.highlight}
          progress={topicToWorkerProgress}
          animateFlow={true}
          flowSpeed={2}
          style={{ position: 'absolute' }}
        />
      ))}
      {/* Workers */}
      {workerPositions.map((pos, i) => (
        <GlowingNode
          key={i}
          color={PALETTE.secondary}
          size={WORKER_RADIUS * 2}
          pulsing={false}
          style={{
            position: 'absolute',
            left: pos.x - WORKER_RADIUS,
            top: pos.y - WORKER_RADIUS,
            opacity: workerOpacity,
            backgroundColor: PALETTE.codeBg,
            borderRadius: '50%',
          }}
        />
      ))}
    </div>
  );
};

const Diagram: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: 'relative',
      width: 960,
      height: 1080,
      backgroundColor: PALETTE.background,
    }}
  >
    <BottleneckDiagram progress={progress} />
    <DistributedDiagram progress={progress} />
  </div>
);

export default function Scene() {
  return (
    <SceneLayout
      title="Naïve Single‑Server Booking: Why It Crashes Under Load"
      subtitle="Ticketing systems face a sudden surge in requests, often leading to lost sales and frustrated customers."
      bullets={['Sequential Processing', 'Concurrency', 'Distributed Systems']}
      renderDiagram={(progress) => <Diagram progress={progress} />}
      mode="split"
    />
  );
}