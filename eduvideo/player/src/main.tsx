// Player entry. Reads the job id from ?job=<id>, loads + validates its module
// bundle, then mounts the Player. Any load/validation failure shows a clear message
// instead of a blank screen.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "./Player";
import { jobIdFromUrl, loadModule, Module } from "./module";
import { globalCss, theme } from "./styles/designSystem";

function App() {
  const [module, setModule] = useState<Module | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jobId = jobIdFromUrl();
    if (!jobId) {
      setError("No job specified. Open this player as /player/?job=<jobId>.");
      return;
    }
    loadModule(jobId)
      .then(setModule)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 48, maxWidth: 640, margin: "0 auto", fontFamily: theme.font.family }}>
        <h2 style={{ color: theme.colors.incorrect }}>Could not load module</h2>
        <p style={{ color: theme.colors.textMuted }}>{error}</p>
      </div>
    );
  }
  if (!module) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", color: theme.colors.textMuted }}>
        Loading module…
      </div>
    );
  }
  return <Player module={module} />;
}

const style = document.createElement("style");
style.textContent = globalCss(theme);
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
