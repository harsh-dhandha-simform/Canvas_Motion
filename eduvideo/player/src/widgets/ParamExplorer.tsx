// param_explorer — move sliders; a live value read-out + a simple bar visualization
// updates. Generic: works for any numeric params the planner emits (input size,
// cache size, load, etc.). `visualization` is a human description shown as a caption.
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { ParamExplorerProps } from "../types";
import { Card } from "./ui";

export function ParamExplorer({ props }: { props: ParamExplorerProps }) {
  const params = props.params ?? [];
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(params.map((p) => [p.name, p.default])),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(2) }}>
      {params.map((p) => {
        const v = values[p.name] ?? p.default;
        const frac = (v - p.min) / (p.max - p.min || 1);
        return (
          <Card key={p.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: t.space(1) }}>
              <span style={{ fontWeight: 600 }}>{p.label}</span>
              <span style={{ color: t.colors.primary, fontWeight: 700, fontFamily: t.font.mono }}>{v}</span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={v}
              onChange={(e) => setValues((prev) => ({ ...prev, [p.name]: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: t.colors.primary }}
            />
            {/* live bar so the change is visual, not just a number */}
            <div style={{ height: 8, background: t.colors.surfaceAlt, borderRadius: 4, marginTop: t.space(1) }}>
              <div
                style={{
                  width: `${Math.max(2, frac * 100)}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: t.colors.primary,
                  transition: `width ${t.motion.fast}`,
                }}
              />
            </div>
          </Card>
        );
      })}
      {props.visualization && (
        <div style={{ color: t.colors.textMuted, fontSize: 14, lineHeight: 1.5 }}>{props.visualization}</div>
      )}
    </div>
  );
}
