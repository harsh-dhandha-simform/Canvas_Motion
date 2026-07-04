// flashcards — flip a card to reveal the back; step through the deck.
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { FlashcardsProps } from "../types";
import { Button } from "./ui";

export function Flashcards({ props }: { props: FlashcardsProps }) {
  const cards = props.cards ?? [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];
  if (!card) return <div>No cards provided.</div>;

  const go = (delta: number) => {
    setFlipped(false);
    setI((v) => Math.max(0, Math.min(cards.length - 1, v + delta)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(2) }}>
      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          minHeight: 180,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: t.space(3),
          borderRadius: t.radius.lg,
          cursor: "pointer",
          border: `1.5px solid ${flipped ? t.colors.accent : t.colors.border}`,
          background: flipped ? t.colors.surfaceAlt : t.colors.surface,
          boxShadow: t.shadow.card,
          transition: `all ${t.motion.base}`,
        }}
      >
        <div>
          <div style={{ color: t.colors.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            {flipped ? "ANSWER" : "TERM"} · tap to flip
          </div>
          <div style={{ fontSize: flipped ? 18 : 24, fontWeight: 700, lineHeight: 1.4 }}>
            {flipped ? card.back : card.front}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="ghost" onClick={() => go(-1)} disabled={i === 0}>
          ← Prev
        </Button>
        <span style={{ color: t.colors.textMuted, fontSize: 14 }}>
          {i + 1} / {cards.length}
        </span>
        <Button variant="ghost" onClick={() => go(1)} disabled={i === cards.length - 1}>
          Next →
        </Button>
      </div>
    </div>
  );
}
