import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { z } from "zod";
import { useContainerScale } from "../hooks/useContainerScale";

export const TradeoffMatrixSchema = z.object({
  title: z.string().optional(),
  rows: z.array(
    z.object({
      label: z.string(),
      color: z.string().optional(),
    })
  ),
  columns: z.array(
    z.object({
      label: z.string(),
    })
  ),
  cells: z.array(
    z.object({
      rowIdx: z.number(),
      colIdx: z.number(),
      value: z.enum(["high", "medium", "low", "yes", "no", "partial"]),
      note: z.string().optional(),
    })
  ),
  accentColor: z.string().optional(),
});

export type TradeoffMatrixProps = z.infer<typeof TradeoffMatrixSchema>;

const VALUE_COLORS: Record<string, string> = {
  high: "#34d399",
  yes: "#34d399",
  medium: "#f59e0b",
  partial: "#f59e0b",
  low: "#ef4444",
  no: "#ef4444",
};

export const TradeoffMatrix: React.FC<TradeoffMatrixProps> = ({
  title,
  rows,
  columns,
  cells,
  accentColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { ref, scale } = useContainerScale();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Map cells for quick row/col lookup
  const cellMap = new Map<string, typeof cells[0]>();
  cells.forEach((c) => {
    cellMap.set(`${c.rowIdx}-${c.colIdx}`, c);
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
            marginBottom: 32,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: "12px 12px",
            width: "100%",
            maxWidth: "1400px",
            fontSize: "20px",
          }}
        >
          <thead>
            <tr>
              {/* Top-left empty cell */}
              <th style={{ minWidth: "220px" }}></th>
              {columns.map((col, colIdx) => (
                <th
                  key={`col-${colIdx}`}
                  style={{
                    color: "#94a3b8",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "16px",
                    textAlign: "center",
                    borderBottom: `2.5px solid ${accentColor}33`,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const rowRevealFrame = 15 + rowIdx * 12;
              const rowOpacity = interpolate(frame, [rowRevealFrame, rowRevealFrame + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });
              const rowTranslateY = interpolate(frame, [rowRevealFrame, rowRevealFrame + 15], [20, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });

              return (
                <tr
                  key={`row-${rowIdx}`}
                  style={{
                    opacity: rowOpacity,
                    transform: `translateY(${rowTranslateY}px)`,
                  }}
                >
                  {/* System Header Cell */}
                  <td
                    style={{
                      fontWeight: 900,
                      color: row.color || "#f1f5f9",
                      padding: "20px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: row.color || accentColor,
                          display: "inline-block",
                        }}
                      />
                      {row.label}
                    </div>
                  </td>

                  {/* Value Cells */}
                  {columns.map((_, colIdx) => {
                    const cell = cellMap.get(`${rowIdx}-${colIdx}`);
                    if (!cell) {
                      return <td key={`cell-${rowIdx}-${colIdx}`}></td>;
                    }

                    const valColor = VALUE_COLORS[cell.value] || "#cbd5e1";

                    return (
                      <td
                        key={`cell-${rowIdx}-${colIdx}`}
                        style={{
                          textAlign: "center",
                          padding: "16px",
                          background: "#0b0f19",
                          border: `1px solid ${valColor}22`,
                          borderRadius: "12px",
                          boxShadow: `inset 0 0 12px ${valColor}0b`,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 18px",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            backgroundColor: `${valColor}18`,
                            color: valColor,
                            border: `1.5px solid ${valColor}33`,
                            boxShadow: `0 0 10px ${valColor}11`,
                          }}
                        >
                          {cell.value}
                        </span>
                        {cell.note && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginTop: "8px",
                              fontFamily: "monospace",
                            }}
                          >
                            {cell.note}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
