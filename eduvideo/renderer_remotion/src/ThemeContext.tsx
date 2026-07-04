/**
 * ThemeContext.tsx
 * 
 * Provides a React context for the video theme (colors and font).
 * All scene components should read from this to ensure consistent styling
 * that matches the backend's generated theme.
 */
import React, { createContext, useContext } from "react";

export type Theme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  font: string;
};

const DEFAULT_THEME: Theme = {
  primary: "#7c3aed",
  secondary: "#f59e0b",
  accent: "#34d399",
  background: "#0a0e1a",
  font: "Inter",
};

export const ThemeContext = createContext<Theme>(DEFAULT_THEME);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{
  theme: Partial<Theme>;
  children: React.ReactNode;
}> = ({ theme, children }) => {
  const merged: Theme = { ...DEFAULT_THEME, ...theme };
  return (
    <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>
  );
};
