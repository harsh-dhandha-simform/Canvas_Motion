// The player layout (Phase 12 deliverable #4). Video on the left, a slide-in
// interaction panel on the right toggled by a top-right button. The <video> element
// is the single source of truth for time: a `timeupdate`/`seeking` listener drives
// concept sync, and the panel merely follows — the video never pauses when the panel
// opens/closes (non-blocking overlay; the video area just reflows).
import { useEffect, useMemo, useRef, useState } from "react";
import { conceptAt } from "./conceptSync";
import { InteractionPanel } from "./InteractionPanel";
import { Module } from "./module";
import { theme as t } from "./styles/designSystem";

const PANEL_WIDTH = 440;

export function Player({ module }: { module: Module }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  // The <video> is the clock. Track currentTime on timeupdate + seeking so the
  // concept (and thus the panel widget) stays in sync, including on scrubs.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeking", onTime);
    v.addEventListener("seeked", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeking", onTime);
      v.removeEventListener("seeked", onTime);
    };
  }, []);

  const concept = useMemo(() => conceptAt(module.concepts, time), [module.concepts, time]);
  const conceptIndex = concept ? module.concepts.concepts.findIndex((c) => c.id === concept.id) : -1;
  const total = module.concepts.concepts.length;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: t.colors.bg }}>
      {/* LEFT: video stage (expands when the panel is closed) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: t.space(4),
          transition: `all ${t.motion.base} ease`,
        }}
      >
        <div style={{ width: "100%", maxWidth: 1280 }}>
          <video
            ref={videoRef}
            src={module.videoUrl}
            controls
            style={{
              width: "100%",
              borderRadius: t.radius.lg,
              border: `1px solid ${t.colors.border}`,
              boxShadow: t.shadow.card,
              background: "#000",
            }}
          />
          {concept && (
            <div style={{ marginTop: t.space(2), color: t.colors.textMuted, fontSize: 14 }}>
              Now covering:{" "}
              <span style={{ color: t.colors.text, fontWeight: 600 }}>{concept.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* toggle button — always top-right */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        style={{
          position: "fixed",
          top: t.space(3),
          right: t.space(3),
          zIndex: 10,
          padding: `${t.space(1.25)}px ${t.space(2)}px`,
          borderRadius: t.radius.sm,
          border: `1px solid ${t.colors.border}`,
          background: t.colors.surface,
          color: t.colors.text,
          fontWeight: 600,
          fontSize: 14,
          boxShadow: t.shadow.card,
        }}
      >
        {panelOpen ? "Hide panel ›" : "‹ Show panel"}
      </button>

      {/* RIGHT: interaction panel (slides in/out) */}
      <div
        style={{
          width: panelOpen ? PANEL_WIDTH : 0,
          flex: `0 0 ${panelOpen ? PANEL_WIDTH : 0}px`,
          overflow: "hidden",
          background: t.colors.bgAlt,
          borderLeft: panelOpen ? `1px solid ${t.colors.border}` : "none",
          boxShadow: panelOpen ? t.shadow.panel : "none",
          transition: `all ${t.motion.base} ease`,
        }}
      >
        <div style={{ width: PANEL_WIDTH, height: "100%" }}>
          <InteractionPanel
            interactions={module.interactions}
            concept={concept}
            index={conceptIndex}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}
