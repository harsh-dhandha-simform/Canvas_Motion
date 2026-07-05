import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { z } from "zod";
import { ServerRack } from "./ServerRack";
import { GlowingNode } from "./GlowingNode";
import { DataStream } from "./DataStream";
import { ScalingArrow } from "./ScalingArrow";
import { usePanelSize } from "../PanelSizeContext";

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
  title: _title,
  nodes = [],
  connections = [],
  accentColor = "#38BDF8"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: cw, height: chh } = usePanelSize();

  // The nodes (ServerRack/GlowingNode) are fixed-pixel boxes positioned by x/y %.
  // In a narrow panel those boxes would collide, so render the whole diagram in a
  // 1920×1080 design box and uniformly scale it to fit the cell — spacing that
  // reads correctly full-screen stays correct (just smaller) in any panel.
  const DESIGN_W = 1920;
  const DESIGN_H = 1080;
  const fitScale = Math.min(cw / DESIGN_W, chh / DESIGN_H) || 1;

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
    <AbsoluteFill style={{ backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          position: "relative",
          flexShrink: 0,
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
        }}
      >

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

      </div>
    </AbsoluteFill>
  );
};
