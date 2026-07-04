// Runs a snippet of JS in a throwaway Web Worker (Phase 12 deliverable #6 sandbox).
// The worker has no DOM and no access to this page. Before the user code runs we
// null out network primitives (fetch/XHR/WebSocket/importScripts) so a snippet can't
// phone home, and a wall-clock timeout terminates runaway loops. This is best-effort
// isolation for the "try the code" widget — not a security boundary for hostile code
// (that is what the `custom` iframe + Phase 11 static validation are for).
const WORKER_SRC = `
  self.fetch = undefined;
  self.XMLHttpRequest = undefined;
  self.WebSocket = undefined;
  self.importScripts = undefined;
  self.onmessage = (e) => {
    const logs = [];
    const push = (...a) => logs.push(a.map((x) => {
      try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (_) { return String(x); }
    }).join(' '));
    const sandboxConsole = { log: push, info: push, warn: push, error: push };
    try {
      const fn = new Function('console', e.data.code);
      const ret = fn(sandboxConsole);
      if (ret !== undefined) push(ret);
      self.postMessage({ ok: true, output: logs.join('\\n') });
    } catch (err) {
      self.postMessage({ ok: false, output: logs.join('\\n'), error: String(err) });
    }
  };
`;

export interface RunResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function runJs(code: string, timeoutMs = 2000): Promise<RunResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "application/javascript" }));
    const worker = new Worker(url);
    let done = false;
    const finish = (r: RunResult) => {
      if (done) return;
      done = true;
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(
      () => finish({ ok: false, output: "", error: `Timed out after ${timeoutMs}ms (possible infinite loop).` }),
      timeoutMs,
    );
    worker.onmessage = (e: MessageEvent<RunResult>) => {
      clearTimeout(timer);
      finish(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      finish({ ok: false, output: "", error: e.message });
    };
    worker.postMessage({ code });
  });
}
