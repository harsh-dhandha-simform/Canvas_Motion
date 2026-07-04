import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const HashRingSchema = z.object({
  title: z.string().optional(),
  servers: z.array(z.string()).min(2).max(6),
  virtualNodesPerServer: z.number().min(2).max(64).optional(),
  lookupKeys: z.array(z.string()).optional(),
  ticks: z.number().min(24).max(360).optional(),
  accentColor: z.string().optional(),
  showLegend: z.boolean().optional(),
  centerLabel: z.string().optional(),
  centerSubLabel: z.string().optional(),
});

export type HashRingProps = z.infer<typeof HashRingSchema>;

const SERVER_PALETTE = [
  "#38BDF8", // sky
  "#f59e0b", // amber
  "#a78bfa", // violet
  "#34d399", // emerald
  "#f472b6", // pink
  "#fb923c", // orange
];

export const HashRing: React.FC<HashRingProps> = ({
  title,
  servers,
  virtualNodesPerServer = 3,
  lookupKeys = [],
  ticks = 96,
  accentColor = "#38BDF8",
  showLegend = true,
  centerLabel = "HASH RING",
  centerSubLabel = "0 ... 2³² − 1",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { ref, scale } = useContainerScale();

  // Layout centered: 960x540
  const cx = 960;
  const cy = 540;
  const radius = 300;
  const ringStroke = 2;

  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const rand = rng(42);
  const vnodes: { serverIdx: number; angle: number; r: number }[] = [];
  servers.forEach((_, sIdx) => {
    for (let v = 0; v < virtualNodesPerServer; v++) {
      vnodes.push({
        serverIdx: sIdx,
        angle: rand() * Math.PI * 2,
        r: radius + (v % 2 === 0 ? -18 : 18),
      });
    }
  });

  const serverSprings = servers.map((_, i) =>
    spring({
      frame: frame - (10 + i * 10),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 30,
    })
  );

  const lookupStart = 20 + servers.length * 10 + 10;
  const lookupDuration = 60;
  const lookupProgress = (keyIdx: number) =>
    interpolate(
      frame,
      [lookupStart + keyIdx * 30, lookupStart + keyIdx * 30 + lookupDuration],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      }
    );

  const keyAngles = lookupKeys.map((_, i) => {
    const r = rng(7 + i * 13);
    return r() * Math.PI * 2;
  });

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Title section remains fixed and stable */}
      {title && (
        <h2
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 12,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}
      <p
        style={{
          color: "#94a3b8",
          fontSize: 18,
          margin: 0,
          opacity: titleOpacity,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Keys and servers are hashed onto the ring; each key walks clockwise to the next server.
      </p>

      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1920 1080"
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            <filter id="hash-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tick marks */}
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const x1 = cx + Math.cos(a) * (radius - 10);
            const y1 = cy + Math.sin(a) * (radius - 10);
            const x2 = cx + Math.cos(a) * radius;
            const y2 = cy + Math.sin(a) * radius;
            return (
              <line
                key={`tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#334155"
                strokeWidth={1}
                opacity={0.35}
              />
            );
          })}

          {/* Main ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={ringStroke}
            opacity={0.55}
            filter="url(#hash-ring-glow)"
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius - 1}
            fill="none"
            stroke="#1e293b"
            strokeWidth={ringStroke}
            opacity={0.9}
          />

          {/* Center labels */}
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            fill="#64748b"
            fontSize={16}
            fontFamily="Fira Code, monospace"
            opacity={titleOpacity}
          >
            {centerLabel}
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill="#475569"
            fontSize={14}
            fontFamily="Fira Code, monospace"
            opacity={titleOpacity}
          >
            {centerSubLabel}
          </text>

          {/* Virtual nodes */}
          {vnodes.map((v, i) => {
            const x = cx + Math.cos(v.angle) * v.r;
            const y = cy + Math.sin(v.angle) * v.r;
            const color = SERVER_PALETTE[v.serverIdx % SERVER_PALETTE.length];
            const opacity = serverSprings[v.serverIdx];
            return (
              <circle
                key={`vnode-${i}`}
                cx={x}
                cy={y}
                r={7}
                fill={color}
                opacity={opacity}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            );
          })}

          {/* Server labels */}
          {servers.map((name, sIdx) => {
            const myVnodes = vnodes.filter((v) => v.serverIdx === sIdx);
            let sx = 0,
              sy = 0;
            myVnodes.forEach((v) => {
              sx += Math.cos(v.angle);
              sy += Math.sin(v.angle);
            });
            const avgA = Math.atan2(sy / myVnodes.length, sx / myVnodes.length);
            const labelR = radius + 80;
            const x = cx + Math.cos(avgA) * labelR;
            const y = cy + Math.sin(avgA) * labelR;
            const color = SERVER_PALETTE[sIdx % SERVER_PALETTE.length];

            const sp = serverSprings[sIdx];
            const labelOpacity = sp;
            const scaleVal = interpolate(sp, [0, 1], [0.7, 1]);

            return (
              <g
                key={`srv-${sIdx}`}
                transform={`translate(${x}, ${y}) scale(${scaleVal})`}
                style={{ opacity: labelOpacity, transformOrigin: `${x}px ${y}px` }}
              >
                <line
                  x1={cx + Math.cos(avgA) * radius - x}
                  y1={cy + Math.sin(avgA) * radius - y}
                  x2={0}
                  y2={0}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.4}
                />
                <rect
                  x={-60}
                  y={-22}
                  width={120}
                  height={44}
                  rx={10}
                  fill="#0f1729"
                  stroke={color}
                  strokeWidth={2}
                  style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
                />
                <text
                  x={0}
                  y={6}
                  textAnchor="middle"
                  fill={color}
                  fontSize={18}
                  fontWeight={800}
                  fontFamily="Inter, sans-serif"
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* Lookup keys */}
          {lookupKeys.map((keyName, keyIdx) => {
            const startA = keyAngles[keyIdx];
            const progress = lookupProgress(keyIdx);
            const sweepA = startA + progress * Math.PI;
            const x = cx + Math.cos(sweepA) * radius;
            const y = cy + Math.sin(sweepA) * radius;

            let targetServerIdx = 0;
            let smallestGap = Math.PI * 2;
            servers.forEach((_, sIdx) => {
              const myVnodes = vnodes.filter((v) => v.serverIdx === sIdx);
              let sx = 0,
                sy = 0;
              myVnodes.forEach((v) => {
                sx += Math.cos(v.angle);
                sy += Math.sin(v.angle);
              });
              const avgA = Math.atan2(sy / myVnodes.length, sx / myVnodes.length);
              let gap = avgA - startA;
              while (gap < 0) gap += Math.PI * 2;
              if (gap < smallestGap) {
                smallestGap = gap;
                targetServerIdx = sIdx;
              }
            });
            const color = SERVER_PALETTE[targetServerIdx % SERVER_PALETTE.length];

            return (
              <g key={`lookup-${keyIdx}`} opacity={progress > 0 ? 1 : 0}>
                <g
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${(startA * 180) / Math.PI}deg)`,
                  }}
                >
                  <line
                    x1={cx + radius}
                    y1={cy}
                    x2={cx + radius + 40 * progress}
                    y2={cy}
                    stroke={color}
                    strokeWidth={4}
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                  />
                </g>

                <circle
                  cx={x}
                  cy={y}
                  r={9}
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 12px ${color})` }}
                />

                <g
                  transform={`translate(${x + 16}, ${y - 28})`}
                  style={{ opacity: progress > 0.1 ? 1 : 0 }}
                >
                  <rect
                    x={0}
                    y={-14}
                    width={Math.max(60, keyName.length * 9 + 12)}
                    height={28}
                    rx={6}
                    fill="#0f1729"
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <text
                    x={6}
                    y={5}
                    fill={color}
                    fontSize={14}
                    fontFamily="Fira Code, monospace"
                    fontWeight={700}
                  >
                    {keyName}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Legend remains fixed at the side */}
        {showLegend && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: titleOpacity,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Servers
            </div>
            {servers.map((name, i) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "Inter, sans-serif",
                  opacity: serverSprings[i],
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: SERVER_PALETTE[i % SERVER_PALETTE.length],
                    boxShadow: `0 0 10px ${SERVER_PALETTE[i % SERVER_PALETTE.length]}`,
                  }}
                />
                <span style={{ color: "#cbd5e1", fontSize: 16, fontWeight: 600 }}>
                  {name}
                </span>
                <span
                  style={{
                    color: "#475569",
                    fontSize: 13,
                    fontFamily: "Fira Code, monospace",
                  }}
                >
                  · {virtualNodesPerServer} vnodes
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};