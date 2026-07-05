#!/usr/bin/env bash
#
# serve_ngrok.sh — run the FastAPI backend and expose it publicly through ngrok.
#
# Usage:
#   ./serve_ngrok.sh                              # backend on :8000 + ngrok tunnel
#   PORT=9000 ./serve_ngrok.sh                    # custom port
#   NGROK_DOMAIN=your-name.ngrok.app ./serve_ngrok.sh   # use a reserved ngrok domain
#
# Requires:
#   - ngrok, with an authtoken configured once:  ngrok config add-authtoken <token>
#   - uv + synced backend deps:                  cd backend && uv sync
#
# If LLM_BACKEND=ask (the default) it also starts ask_server.py on :8080, which the
# pipeline calls internally (the tunnel only exposes the API on $PORT, not the shim).
#
set -euo pipefail

PORT="${PORT:-8000}"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

command -v ngrok >/dev/null 2>&1 || { echo "❌ ngrok not found — install: https://ngrok.com/download"; exit 1; }
command -v uv    >/dev/null 2>&1 || { echo "❌ uv not found — install: https://docs.astral.sh/uv/"; exit 1; }

# Effective LLM backend: env wins, else read repo-root .env, else default "ask".
LLM_BACKEND="${LLM_BACKEND:-$(grep -E '^[[:space:]]*LLM_BACKEND=' ../.env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d " \"'" || true)}"
LLM_BACKEND="${LLM_BACKEND:-ask}"

PIDS=()
cleanup() {
  trap - INT TERM EXIT
  echo; echo "⏹  stopping …"
  [ ${#PIDS[@]} -gt 0 ] && kill "${PIDS[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# The `ask` backend needs the local Claude shim running alongside the API.
if [ "$LLM_BACKEND" = "ask" ]; then
  echo "▶  LLM_BACKEND=ask → starting ask_server.py on :8080  (log: /tmp/ask_server.log)"
  uv run python ask_server.py > /tmp/ask_server.log 2>&1 &
  PIDS+=($!)
fi

echo "▶  starting backend (uvicorn) on :$PORT  (log: /tmp/backend-$PORT.log)"
uv run uvicorn server:app --host 0.0.0.0 --port "$PORT" > "/tmp/backend-$PORT.log" 2>&1 &
PIDS+=($!)

echo "▶  starting ngrok tunnel → :$PORT  (log: /tmp/ngrok-$PORT.log)"
if [ -n "${NGROK_DOMAIN:-}" ]; then
  ngrok http "$PORT" --domain="$NGROK_DOMAIN" --log=stdout > "/tmp/ngrok-$PORT.log" 2>&1 &
else
  ngrok http "$PORT" --log=stdout > "/tmp/ngrok-$PORT.log" 2>&1 &
fi
PIDS+=($!)

# Read the public URL from ngrok's local inspector API.
PUBLIC_URL=""
for _ in $(seq 1 40); do
  PUBLIC_URL="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(next((t["public_url"] for t in d.get("tunnels",[]) if t.get("public_url","").startswith("https")), ""))' 2>/dev/null || true)"
  [ -n "$PUBLIC_URL" ] && break
  sleep 0.5
done

echo
if [ -n "$PUBLIC_URL" ]; then
  echo "✅  Public API:  $PUBLIC_URL"
  echo "      health:    $PUBLIC_URL/health"
  echo "      generate:  POST $PUBLIC_URL/api/generate-script/async"
  echo "      (CORS is open — the frontend can call this URL directly)"
else
  echo "⚠  Couldn't read the ngrok URL — check http://127.0.0.1:4040 or /tmp/ngrok-$PORT.log"
fi
echo "      ngrok inspector: http://127.0.0.1:4040     (Ctrl+C stops everything)"
echo

# Exit (→ cleanup) as soon as any process dies.
wait -n
