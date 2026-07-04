// A persistent full-frame backdrop mounted once (in project.tsx) behind every
// scene, so the whole video reads as a designed, layered surface instead of a flat
// fill. It is purely decorative: a soft vertical gradient, two large blurred accent
// "glows" for depth, and an edge vignette to focus attention on the centre. All
// colours come from the design tokens, so a theme swap restyles it for free.
import {Circle, Gradient, Rect} from "@revideo/2d";
import {DesignTokens} from "../styles/designSystem";

/** hex (#rgb / #rrggbb) → rgba() string; used for translucent gradient stops. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function radialGlow(color: string, x: number, y: number, radius: number, alpha: number) {
  const g = new Gradient({
    type: "radial",
    from: [0, 0],
    to: [0, 0],
    fromRadius: 0,
    toRadius: radius,
    stops: [
      {offset: 0, color: withAlpha(color, alpha)},
      {offset: 1, color: withAlpha(color, 0)},
    ],
  });
  return <Circle x={x} y={y} width={radius * 2} height={radius * 2} fill={g} />;
}

export function SceneBackdrop(tokens: DesignTokens, width: number, height: number) {
  const base = new Gradient({
    type: "linear",
    from: [0, -height / 2],
    to: [0, height / 2],
    stops: [
      {offset: 0, color: tokens.colors.backgroundAlt},
      {offset: 0.5, color: tokens.colors.background},
      {offset: 1, color: tokens.colors.backgroundAlt},
    ],
  });

  const vignette = new Gradient({
    type: "radial",
    from: [0, 0],
    to: [0, 0],
    fromRadius: Math.min(width, height) * 0.28,
    toRadius: Math.max(width, height) * 0.72,
    stops: [
      {offset: 0, color: "rgba(0, 0, 0, 0)"},
      {offset: 1, color: tokens.dark ? "rgba(0, 0, 0, 0.5)" : "rgba(15, 23, 42, 0.1)"},
    ],
  });

  const glowAlpha = tokens.dark ? 0.22 : 0.14;
  return (
    <Rect width={width} height={height} fill={base} zIndex={-100}>
      {radialGlow(tokens.colors.glow, -width * 0.33, -height * 0.32, width * 0.4, glowAlpha)}
      {radialGlow(tokens.colors.accent, width * 0.36, height * 0.36, width * 0.36, glowAlpha * 0.85)}
      <Rect width={width} height={height} fill={vignette} />
    </Rect>
  );
}
