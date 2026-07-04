// Player-side design system (Phase 12 deliverable #3). Deliberately mirrors the
// video renderer's `dark_matte` theme (renderer/src/styles/designSystem.ts) so the
// slide-in panel and the video read as ONE product. Widgets and layout read tokens
// from here — no ad-hoc inline colours/spacing anywhere in the player.

export interface Theme {
  colors: {
    bg: string;
    bgAlt: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    accent: string;
    correct: string;
    incorrect: string;
    highlight: string;
    glow: string;
  };
  font: { family: string; mono: string };
  radius: { sm: number; md: number; lg: number };
  space: (units: number) => number;
  shadow: { card: string; panel: string };
  motion: { fast: string; base: string; slow: string };
}

// The single theme, matched to the video's dark_matte palette (Tokyo-Night family).
export const theme: Theme = {
  colors: {
    bg: "#13141c",
    bgAlt: "#1a1b26",
    surface: "#232538",
    surfaceAlt: "#2b2e46",
    border: "#343954",
    text: "#c8d0f0",
    textMuted: "#7f88b3",
    primary: "#7aa2f7",
    primaryText: "#0d0f1a",
    accent: "#bb9af7",
    correct: "#9ece6a",
    incorrect: "#f7768e",
    highlight: "#e0af68",
    glow: "#7aa2f7",
  },
  font: {
    family: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, 'SF Mono', Menlo, monospace",
  },
  radius: { sm: 10, md: 16, lg: 24 },
  space: (u: number) => u * 8,
  shadow: {
    card: "0 12px 32px rgba(0, 0, 0, 0.45)",
    panel: "-24px 0 60px rgba(0, 0, 0, 0.5)",
  },
  motion: { fast: "160ms", base: "300ms", slow: "480ms" },
};

// Injected once (main.tsx) so the page background, font, and scrollbars match the
// theme even outside React-rendered surfaces.
export function globalCss(t: Theme): string {
  return `
    * { box-sizing: border-box; }
    html, body, #root { height: 100%; margin: 0; }
    body {
      background: ${t.colors.bg};
      color: ${t.colors.text};
      font-family: ${t.font.family};
      -webkit-font-smoothing: antialiased;
    }
    button { font-family: inherit; cursor: pointer; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: ${t.colors.bgAlt}; }
    ::-webkit-scrollbar-thumb { background: ${t.colors.surfaceAlt}; border-radius: 6px; }
    ::-webkit-scrollbar-thumb:hover { background: ${t.colors.border}; }
  `;
}
