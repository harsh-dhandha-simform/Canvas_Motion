// data_structure — a minimal, generic stack/queue/array visualizer with
// insert/remove. Reads `initialState.items` if present. Tree/graph/hash types fall
// back to showing their initial items linearly (a fuller viz is future work).
import { useState } from "react";
import { theme as t } from "../styles/designSystem";
import { DataStructureProps } from "../types";
import { Button } from "./ui";

function initialItems(props: DataStructureProps): (string | number)[] {
  const raw = (props.initialState as { items?: unknown })?.items;
  return Array.isArray(raw) ? (raw as (string | number)[]) : [];
}

export function DataStructure({ props }: { props: DataStructureProps }) {
  const type = (props.structureType ?? "stack").toLowerCase();
  const isQueue = type.includes("queue");
  const [items, setItems] = useState<(string | number)[]>(() => initialItems(props));
  const [next, setNext] = useState(1);

  const insert = () => {
    setItems((xs) => [...xs, next]);
    setNext((n) => n + 1);
  };
  const remove = () =>
    setItems((xs) => (isQueue ? xs.slice(1) : xs.slice(0, -1))); // queue: FIFO; stack/array: from end

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(2) }}>
      <div style={{ color: t.colors.textMuted, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
        {type.toUpperCase()}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: isQueue ? "row" : "column-reverse",
          gap: 8,
          minHeight: 60,
          flexWrap: "wrap",
          alignItems: isQueue ? "center" : "stretch",
        }}
      >
        {items.length === 0 && <span style={{ color: t.colors.textMuted }}>empty</span>}
        {items.map((v, i) => (
          <div
            key={i}
            style={{
              padding: `${t.space(1.25)}px ${t.space(2)}px`,
              minWidth: 52,
              textAlign: "center",
              borderRadius: t.radius.sm,
              background: t.colors.surface,
              border: `1.5px solid ${t.colors.primary}`,
              fontFamily: t.font.mono,
              fontWeight: 700,
            }}
          >
            {v}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: t.space(1.5) }}>
        <Button onClick={insert}>{isQueue ? "Enqueue" : "Push"}</Button>
        <Button variant="ghost" onClick={remove} disabled={items.length === 0}>
          {isQueue ? "Dequeue" : "Pop"}
        </Button>
      </div>
    </div>
  );
}
