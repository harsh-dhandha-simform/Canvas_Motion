// The right-hand interaction panel (Phase 12 deliverable #5). Given the currently
// active concept, it shows that concept's interaction widget. When the concept
// changes (video crossing a boundary, or a seek), the widget cross-fades to the new
// one — keyed by concept id so React remounts it (fresh widget state per concept).
import { useMemo } from "react";
import { ConceptWindow, Interactions } from "./types";
import { theme as t } from "./styles/designSystem";
import { Widget } from "./widgets/registry";

export function InteractionPanel({
  interactions,
  concept,
  index,
  total,
}: {
  interactions: Interactions;
  concept: ConceptWindow | null;
  index: number;
  total: number;
}) {
  const interaction = useMemo(
    () => (concept ? interactions.interactions.find((i) => i.concept_id === concept.id) ?? null : null),
    [interactions, concept],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header: active concept + progress through the spine. paddingRight reserves
          room for the page-level toggle button (fixed at the viewport's top-right,
          which lands directly over this panel's own top-right corner when open) so
          a long widget title never wraps underneath it. */}
      <div style={{ padding: t.space(3), paddingRight: 148, borderBottom: `1px solid ${t.colors.border}` }}>
        <div style={{ color: t.colors.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
          INTERACTIVE {total > 0 && concept ? `· ${index + 1} / ${total}` : ""}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
          {interaction?.title ?? concept?.title ?? "Interaction panel"}
        </div>
        {/* concept progress pips */}
        <div style={{ display: "flex", gap: 5, marginTop: t.space(1.5) }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i === index ? t.colors.primary : i < index ? t.colors.accent : t.colors.surfaceAlt,
                transition: `background ${t.motion.base}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* body: the widget, remounted per concept with a fade-in */}
      <div style={{ flex: 1, overflowY: "auto", padding: t.space(3) }}>
        {interaction ? (
          <div
            key={interaction.concept_id}
            style={{ animation: `fadeSlide ${t.motion.base} ease` }}
          >
            <Widget interaction={interaction} />
          </div>
        ) : (
          <div style={{ color: t.colors.textMuted, marginTop: t.space(4), textAlign: "center" }}>
            The interactive panel follows the video. Press play to begin.
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
