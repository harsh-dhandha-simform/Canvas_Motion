// Sandbox host for `custom` interactions (Phase 12 deliverable #7) — the runtime
// counterpart to Phase 11's static sandbox validation (defence in depth). The
// custom JSX/JS is mounted inside an <iframe sandbox="allow-scripts"> WITHOUT
// allow-same-origin, so it runs in an opaque origin: no access to this page's DOM,
// cookies, or storage. A strict CSP (default-src 'none') additionally blocks all
// network (fetch/XHR/WebSocket/remote scripts) from inside the frame.
import { useMemo } from "react";
import { theme as t } from "../styles/designSystem";
import { CustomCode } from "../types";

function buildSrcDoc(custom: CustomCode): string {
  // The custom code is expected to be a self-contained component/script. We render
  // via a tiny React-free harness: expose a #root and run the user's default export
  // if it returns markup, else just run the script for its side effects on #root.
  return `<!doctype html><html><head>
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
    <style>
      html,body{margin:0;font-family:${t.font.family};color:${t.colors.text};background:${t.colors.surface};}
      body{padding:16px;}
    </style>
  </head><body>
    <div id="root"></div>
    <script>
      try {
        ${custom.code}
      } catch (e) {
        document.getElementById('root').innerText = 'custom widget error: ' + e;
      }
    </script>
  </body></html>`;
}

export function SandboxHost({ custom }: { custom: CustomCode }) {
  const srcDoc = useMemo(() => buildSrcDoc(custom), [custom]);
  return (
    <iframe
      title="custom-interaction"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={{
        width: "100%",
        minHeight: 260,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.md,
        background: t.colors.surface,
      }}
    />
  );
}
