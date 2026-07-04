// step_through — advance forward/back through the stages of a process.
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { StepThroughProps } from "../types";
import { Button, Card } from "./ui";

export function StepThrough({ props }: { props: StepThroughProps }) {
  const steps = props.steps ?? [];
  const [i, setI] = useState(0);
  const step = steps[i];
  if (!step) return <Card>No steps provided.</Card>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(2) }}>
      {/* progress dots */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {steps.map((_, idx) => (
          <div
            key={idx}
            onClick={() => setI(idx)}
            style={{
              width: 30,
              height: 6,
              borderRadius: 3,
              cursor: "pointer",
              background: idx <= i ? t.colors.primary : t.colors.surfaceAlt,
              transition: `background ${t.motion.fast}`,
            }}
          />
        ))}
      </div>

      <Card>
        <div style={{ color: t.colors.primary, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          STEP {i + 1} / {steps.length}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, margin: `${t.space(1)}px 0` }}>{step.label}</div>
        <div style={{ color: t.colors.textMuted, fontSize: 15, lineHeight: 1.5 }}>{step.detail}</div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button variant="ghost" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          ← Back
        </Button>
        <Button onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))} disabled={i === steps.length - 1}>
          Next →
        </Button>
      </div>
    </div>
  );
}
