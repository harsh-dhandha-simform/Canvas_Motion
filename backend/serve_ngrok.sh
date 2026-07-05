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
# LLM_BACKEND=ask (the default) only ROUTES agent calls to $ASK_URL — it does not
# start a server. This script launches the bundled ask_server.py on :8080 for you,
# but that shim needs the `claude` CLI installed+authed on THIS machine. On a server
# without the claude CLI, use LLM_BACKEND=groq or azure instead (no shim needed).
#
set -euo pipefail

PORT="${PORT:-8000}"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

command -v ngrok >/dev/null 2>&1 || { echo "❌ ngrok not found — install: https://ngrok.com/download"; exit 1; }
command -v uv    >/dev/null 2>&1 || { echo "❌ uv not found — install: https://docs.astral.sh/uv/"; exit 1; }

# Read a KEY from the environment, else from the repo-root .env, else a fallback.
env_or_dotenv() {  # $1=var name  $2=fallback
  local v="${!1:-}"
  [ -z "$v" ] && v="$(grep -E "^[[:space:]]*$1=" ../.env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d " \"'" || true)"
  echo "${v:-$2}"
}
LLM_BACKEND="$(env_or_dotenv LLM_BACKEND ask)"
ASK_URL="$(env_or_dotenv ASK_URL http://127.0.0.1:8080/ask)"

PIDS=()
cleanup() {
  trap - INT TERM EXIT
  echo; echo "⏹  stopping …"
  [ ${#PIDS[@]} -gt 0 ] && kill "${PIDS[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# The `ask` backend needs a server at $ASK_URL — launch the bundled shim on :8080.
if [ "$LLM_BACKEND" = "ask" ]; then
  echo "▶  LLM_BACKEND=ask → starting ask_server.py on :8080  (log: /tmp/ask_server.log)"
  uv run python ask_server.py > /tmp/ask_server.log 2>&1 &
  PIDS+=($!)
fi

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
echo "   LLM_BACKEND=$LLM_BACKEND"
[ "$LLM_BACKEND" = "ask" ] && echo "   ASK_URL=$ASK_URL   (a server must be listening here)"
if [ -n "$PUBLIC_URL" ]; then
  echo "✅  Public API:  $PUBLIC_URL"
  echo "      health:    $PUBLIC_URL/health"
  echo "      generate:  POST $PUBLIC_URL/api/generate-script/async"
  echo "      (CORS is open — the frontend can call this URL directly)"
else
  echo "⚠  Couldn't read the ngrok URL — check http://127.0.0.1:4040 or /tmp/ngrok-$PORT.log"
fi
echo "      ngrok inspector: http://127.0.0.1:4040     (Ctrl+C stops everything)"
echo "─────────────────────────── backend logs (live) ───────────────────────────"

# Run uvicorn in the FOREGROUND so its request + job logs stream to THIS terminal.
# (Not backgrounded/redirected — that's why hitting the API showed no logs before.)
# When it exits (Ctrl+C) the trap tears down ngrok + ask_server.
uv run uvicorn server:app --host 0.0.0.0 --port "$PORT"
