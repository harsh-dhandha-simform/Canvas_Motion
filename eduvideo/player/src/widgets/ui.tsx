// Small shared, token-driven UI atoms used across widgets so every widget looks like
// part of the same product (no ad-hoc per-widget styling). Everything reads from the
// design-system `theme`.
import { CSSProperties, ReactNode } from "react";
import { theme as t } from "../styles/designSystem";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    border: "1px solid",
    borderRadius: t.radius.sm,
    padding: `${t.space(1.25)}px ${t.space(2.25)}px`,
    fontSize: 15,
    fontWeight: 600,
    transition: `all ${t.motion.fast} ease`,
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? "none" : "auto",
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: t.colors.primary, color: t.colors.primaryText, borderColor: t.colors.primary },
    ghost: { background: "transparent", color: t.colors.text, borderColor: t.colors.border },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.md,
        boxShadow: t.shadow.card,
        padding: t.space(2.5),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: `${t.space(0.75)}px ${t.space(1.5)}px`,
        borderRadius: t.radius.lg,
        fontSize: 13,
        fontWeight: 600,
        color: active ? t.colors.primaryText : t.colors.primary,
        background: active ? t.colors.primary : t.colors.surfaceAlt,
        border: `1px solid ${t.colors.primary}`,
      }}
    >
      {children}
    </span>
  );
}
