import React from "react";
import { useCurrentFrame } from "remotion";

interface ServerRackProps {
  scale: number;
  label?: string;
  cpu?: string;
  ram?: string;
  isActive?: boolean;
  isLoadBalancer?: boolean;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

// Helper to extract numeric progress for bars
const parsePercent = (val?: string) => {
  if (!val) return 0;
  const match = val.match(/\d+/);
  if (!match) return 0;
  const num = parseInt(match[0], 10);
  // Map CPU Cores to percentage (e.g. 4 cores = 25%, 32 cores = 95%) or GB RAM (e.g. 16GB = 20%, 128GB = 90%)
  if (val.toLowerCase().includes("core")) {
    return num <= 4 ? 20 : num <= 8 ? 40 : num <= 16 ? 70 : 95;
  }
  if (val.toLowerCase().includes("gb")) {
    return num <= 16 ? 15 : num <= 32 ? 35 : num <= 64 ? 65 : 90;
  }
  return num;
};

// Helper to generate blinking LED states using sine wave of the current frame
const getLedOn = (frame: number, isActive: boolean, index: number) => {
  if (!isActive) return false;
  const speed = [0.15, 0.2, 0.25, 0.3][index % 4];
  const offset = index * 1.5;
  return Math.sin(frame * speed + offset) > -0.2;
};

export const ServerRack: React.FC<ServerRackProps> = ({
  scale,
  label = "Server Node",
  cpu,
  ram,
  isActive = true,
  isLoadBalancer = false,
  color = "#38BDF8", // Sky blue default
  style,
  className,
}) => {
  const frame = useCurrentFrame();

  const cpuPercent = parsePercent(cpu);
  const ramPercent = parsePercent(ram);

  const shadowColor = color;

  return (
    <div
      style={{
        ...style,
        transform: style?.transform ? `${style.transform} scale(${scale})` : `scale(${scale})`,
        transformOrigin: "center center",
        borderColor: isActive ? color : "#334155",
        boxShadow: isActive
          ? `0 20px 40px -15px rgba(15, 23, 42, 0.8), 0 0 25px -5px ${shadowColor}33`
          : "0 10px 20px -10px rgba(0, 0, 0, 0.5)",
        transition: "all 0.1s ease-out",
      }}
      className={`w-72 rounded-2xl border-2 bg-slate-900/90 p-5 flex flex-col items-stretch overflow-hidden select-none ${className || ""}`}
    >
      {/* Top metallic bar */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Main Status LED */}
          <div
            style={{
              backgroundColor: isActive ? (isLoadBalancer ? "#EAB308" : color) : "#475569",
              boxShadow: isActive
                ? `0 0 10px ${isLoadBalancer ? "#EAB308" : color}`
                : "none",
            }}
            className="w-3.5 h-3.5 rounded-full transition-all duration-300"
          />
          <span className="text-slate-200 font-black text-sm uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
          {isLoadBalancer ? "NET_BAL_1" : "SYS_NOD_0"}
        </span>
      </div>

      {isLoadBalancer ? (
        // Load Balancer Visual Interface
        <div className="flex flex-col gap-3 py-2">
          <div className="bg-slate-950 rounded-lg p-3 flex flex-col gap-2 border border-slate-800">
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>LB STATUS:</span>
              <span className="text-yellow-500 font-bold">ROUTING</span>
            </div>
            <div className="flex gap-1.5 justify-center py-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const ledActive = getLedOn(frame, isActive, i);
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: ledActive ? "#EAB308" : "#1E293B",
                      boxShadow: ledActive ? "0 0 6px #EAB308" : "none",
                    }}
                    className="w-2.5 h-2.5 rounded-sm"
                  />
                );
              })}
            </div>
          </div>
          <div className="text-[11px] text-center text-slate-400 font-mono tracking-normal leading-relaxed">
            Distributing load across active nodes...
          </div>
        </div>
      ) : (
        // Server Visual Interface
        <div className="flex flex-col gap-3.5">
          {/* Server details grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">CPU</span>
              <span className="text-white font-bold text-sm mt-0.5">{cpu || "N/A"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">RAM</span>
              <span className="text-white font-bold text-sm mt-0.5">{ram || "N/A"}</span>
            </div>
          </div>

          {/* Metrics Section */}
          {(cpu || ram) && (
            <div className="flex flex-col gap-2 border-t border-slate-800/50 pt-2.5">
              {cpu && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>CPU LOAD</span>
                    <span className="font-bold">{cpuPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      style={{
                        width: `${isActive ? cpuPercent : 0}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              )}
              {ram && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>RAM USED</span>
                    <span className="font-bold">{ramPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      style={{
                        width: `${isActive ? ramPercent : 0}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom LED Blinking panel */}
          <div className="flex items-center justify-between border-t border-slate-800/50 pt-2.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Node LEDs</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => {
                const ledActive = getLedOn(frame, isActive, i);
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: ledActive ? color : "#1E293B",
                      boxShadow: ledActive ? `0 0 6px ${color}` : "none",
                    }}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-150"
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
