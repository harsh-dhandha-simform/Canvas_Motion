import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { z } from "zod";
import { ServerRack } from "./ServerRack";
import { GlowingNode } from "./GlowingNode";
import { DataStream } from "./DataStream";
import { ScalingArrow } from "./ScalingArrow";

// ---------------------------------------------------------------------------
// Zod Schema for JSON Validation
// ---------------------------------------------------------------------------

export const ArchitectureDiagramSchema = z.object({
  title: z.string(),
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["server", "loadBalancer", "database", "client"]),
      x: z.number(), // 0-100 percentage
      y: z.number(), // 0-100 percentage
      label: z.string().optional(),
      metrics: z.object({
        cpu: z.string().optional(),
        ram: z.string().optional()
      }).optional()
    })
  ).optional(),
  connections: z.array(
    z.object({
      fromId: z.string(),
      toId: z.string(),
      type: z.enum(["stream", "arrow"]),
      label: z.string().optional()
    })
  ).optional(),
  accentColor: z.string().optional()
});

export type ArchitectureDiagramProps = z.infer<typeof ArchitectureDiagramSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  title,
  nodes = [],
  connections = [],
  accentColor = "#38BDF8"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Reveal nodes staggered
  const nodeRevealProgress = (index: number) => spring({
    frame: frame - index * 10,
    fps,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 30,
  });

  // Reveal edges after nodes
  const connectionRevealProgress = spring({
    frame: frame - (nodes.length * 10 + 20),
    fps,
    config: { damping: 14, stiffness: 100 },
    durationInFrames: 45,
  });

  // Map nodes for quick lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <div className="absolute top-16 left-16 z-10">
        <h2 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
          {title}
        </h2>
      </div>
      
      <AbsoluteFill>
        
        {/* Render Connections first (underneath) */}
        {connections.map((conn, idx) => {
          const fromNode = nodeMap.get(conn.fromId);
          const toNode = nodeMap.get(conn.toId);
          if (!fromNode || !toNode) return null;

          if (conn.type === "stream") {
            return (
              <div key={`conn-${idx}`} style={{ opacity: Math.min(1, connectionRevealProgress * 2) }}>
                <DataStream 
                  fromX={fromNode.x} 
                  fromY={fromNode.y} 
                  toX={toNode.x} 
                  toY={toNode.y} 
                  color={accentColor}
                  particleCount={4}
                />
              </div>
            );
          } else {
            return (
              <ScalingArrow 
                key={`conn-${idx}`}
                fromX={fromNode.x} 
                fromY={fromNode.y} 
                toX={toNode.x} 
                toY={toNode.y}
                color={accentColor}
                progress={connectionRevealProgress}
                animateFlow={true}
              />
            );
          }
        })}

        {/* Render Nodes */}
        {nodes.map((node, idx) => {
          const scale = interpolate(nodeRevealProgress(idx), [0, 1], [0.5, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp"
          });
          const opacity = interpolate(nodeRevealProgress(idx), [0, 1], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp"
          });

          if (node.type === "server" || node.type === "loadBalancer") {
            return (
              <ServerRack
                key={node.id}
                x={node.x}
                y={node.y}
                scale={scale}
                opacity={opacity}
                label={node.label}
                isLoadBalancer={node.type === "loadBalancer"}
                cpu={node.metrics?.cpu}
                ram={node.metrics?.ram}
                color={node.type === "loadBalancer" ? "#EAB308" : accentColor}
              />
            );
          }

          // fallback to GlowingNode for database/client
          const icon = node.type === "database" ? "💾" : "💻";
          return (
             <GlowingNode
               key={node.id}
               x={node.x}
               y={node.y}
               scale={scale}
               opacity={opacity}
               label={node.label}
               icon={icon}
               color={node.type === "database" ? "#10b981" : "#8b5cf6"}
             />
          );
        })}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
