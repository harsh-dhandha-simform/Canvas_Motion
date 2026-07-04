import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base: "./" makes the built asset URLs relative, so the same static bundle works
// when served under /player/ by the FastAPI backend (see app/main.py) without a
// hardcoded absolute base path.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", sourcemap: false },
});
