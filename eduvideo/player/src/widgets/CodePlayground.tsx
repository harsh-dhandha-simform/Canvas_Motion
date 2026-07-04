// code_playground — edit a snippet and run it. JS/TS run in a sandboxed worker
// (see sandbox/codeRunner). Other languages are shown editable with their expected
// output, but not executed in-browser (we don't ship a Python/etc. runtime).
import { useState } from "react";
import { runJs } from "../sandbox/codeRunner";
import { theme as t } from "../styles/designSystem";
import { CodePlaygroundProps } from "../types";
import { Button } from "./ui";

const RUNNABLE = new Set(["js", "javascript", "ts", "typescript"]);

export function CodePlayground({ props }: { props: CodePlaygroundProps }) {
  const [code, setCode] = useState(props.initialCode ?? "");
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const runnable = RUNNABLE.has((props.language ?? "").toLowerCase());

  const run = async () => {
    setRunning(true);
    const r = await runJs(code);
    setOutput(r.error ? `${r.output}\n⚠ ${r.error}`.trim() : r.output || "(no output)");
    setRunning(false);
  };

  const mono: React.CSSProperties = { fontFamily: t.font.mono, fontSize: 13.5, lineHeight: 1.5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space(1.5) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: t.colors.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
          {(props.language ?? "code").toUpperCase()}
        </span>
        {runnable ? (
          <Button onClick={run} disabled={running}>
            {running ? "Running…" : "▶ Run"}
          </Button>
        ) : (
          <span style={{ color: t.colors.textMuted, fontSize: 12 }}>read-only in browser</span>
        )}
      </div>
      <textarea
        value={code}
        spellCheck={false}
        onChange={(e) => setCode(e.target.value)}
        style={{
          ...mono,
          width: "100%",
          minHeight: 180,
          resize: "vertical",
          color: t.colors.text,
          background: "#16161e",
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.sm,
          padding: t.space(1.5),
          outline: "none",
        }}
      />
      {(output !== null || props.expectedOutput) && (
        <div>
          <div style={{ color: t.colors.textMuted, fontSize: 12, marginBottom: 4 }}>
            {output !== null ? "Output" : "Expected output"}
          </div>
          <pre
            style={{
              ...mono,
              margin: 0,
              whiteSpace: "pre-wrap",
              color: t.colors.text,
              background: t.colors.surfaceAlt,
              border: `1px solid ${t.colors.border}`,
              borderRadius: t.radius.sm,
              padding: t.space(1.5),
            }}
          >
            {output !== null ? output : props.expectedOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
