# Canvas Motion

Turn a text topic into a narrated, animated educational video.

A Python **multi-agent pipeline** (LangGraph) plans the video and emits a single **VideoScript JSON**; a
**Remotion / React** app reads that JSON and renders the video. The two halves share nothing but the JSON
contract — the backend never touches React/Remotion, and the frontend never calls an LLM.

```
 topic ──▶  backend (FastAPI + LangGraph)  ──▶  VideoScript JSON  ──▶  frontend (Remotion)  ──▶  mp4
             researcher → director →                                    DynamicVideo.tsx
             scriptwriter ∥ visual_architect →
             merge → validator → [tts] → assembler
```

The interface between the two halves is `shared/componentCatalog.json` — a machine-readable catalog of
every renderable component (its JSON schema + planning metadata). It is **generated** from the frontend's
`registry.ts`; the backend reads it to know what it may emit.

---

## Repository layout

```
backend/     FastAPI server + LangGraph agent pipeline (Python ≥3.10)
  agents/      researcher · director · scriptwriter · visual_architect (LLM agents)
  graph/       pipeline wiring, shared state, pure-Python nodes (merge/validator/tts/assembler)
  render/      VideoScript JSON → mp4 via `npx remotion render`
  utils/       LLM transports (ask/groq/azure), TTS, timing, tracing
  models/      Pydantic VideoScript model
  server.py    HTTP API
frontend/    Remotion + React 19 + Tailwind v4 (the renderer)
  src/registry.ts        single source of truth for all ~59 components
  src/DynamicVideo.tsx   JSON → animated timeline
  src/Root.tsx           Remotion composition registration
  src/components/         the component library
shared/
  componentCatalog.json  generated contract (backend reads this)
  examples/*.json        curated demo scripts (committed)
  generated/*.json       per-request pipeline outputs (gitignored)
```

For the deeper architecture (how the graph fans out, checkpointing, the merge/dataOwner routing, the
layout engine), see **[CLAUDE.md](./CLAUDE.md)**.

---

## Prerequisites

- **Node.js** + npm (frontend / Remotion)
- **Python ≥ 3.10** and [`uv`](https://github.com/astral-sh/uv) (backend)
- An **LLM backend** — one of:
  - `ask` (default): the local `claude` CLI + `ask_server.py` (no paid API key)
  - `groq`: a `GROQ_API_KEY`
  - `azure`: Azure OpenAI (`AZURE_OPENAI_*`)
- Optional: **`DEEPGRAM_API_KEY`** for narration audio + word-timed captions
- Optional (for rendering to mp4): a **Chrome/Chromium** reachable by Remotion

## Setup

```bash
# 1. Environment — copy the template and fill in what you need
cp .env.example .env

# 2. Backend deps
cd backend && uv sync

# 3. Frontend deps
cd ../frontend && npm install
```

`.env` (at the repo root) is auto-loaded by `backend/config.py`. Set `LLM_BACKEND` to `ask` (default),
`groq`, or `azure`, and provide the matching keys — see [LLM backends](#llm-backends).

---

## Quick start

```bash
# (only for the default `ask` backend) start the Claude HTTP shim on :8080
cd backend && python ask_server.py

# start the API on :8000
cd backend && uvicorn server:app --reload --port 8000

# generate a script (writes shared/generated/<slug>.json and returns it)
curl -X POST http://localhost:8000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{"topic": "How TCP congestion control works", "duration_seconds": 60}'
```

**Preview** the result in Remotion Studio:

```bash
cd frontend && npm run dev      # http://localhost:3000
```

New generations show up automatically as their own compositions; there is also a generic `DynamicVideo`
composition you can point at any script.

**Render to mp4** — either ask the backend (background job) …

```bash
curl -X POST http://localhost:8000/api/render -H "Content-Type: application/json" \
  -d '{"slug": "how-tcp-congestion-control-works"}'
# → {"job_id": "...", "status": "queued"}   then poll:
curl http://localhost:8000/api/render/<job_id>
# → {"status": "done", "output_url": "/renders/<slug>.mp4"}
```

… or render directly with the Remotion CLI:

```bash
cd frontend
npx remotion render DynamicVideo out/video.mp4 --props=../shared/generated/<slug>.json
```

> Rendering needs the frontend's `node_modules` and a Chrome, and — if the script has narration audio —
> the API server must be running (Remotion fetches `/audio/<slug>.mp3` over HTTP). In sandboxed
> environments set `REMOTION_BROWSER_EXECUTABLE` to a Chrome binary.

To generate **and** render in one call, pass `"render": true` to `/api/generate-script`; the response's
`meta.render_job_id` is what you poll.

---

## LLM backends

Selected by `LLM_BACKEND`; all three are dispatched from `backend/utils/api.py:chat_completion`.

| `LLM_BACKEND` | Transport | Requires |
|---|---|---|
| `ask` (default) | `utils/ask_client.py` → `ask_server.py` → local `claude` CLI (model `opus`) | the `claude` CLI + `python ask_server.py` running |
| `groq` | `utils/api.py` rate-limit-aware model chain on Groq | `GROQ_API_KEY` |
| `azure` | `utils/azure_client.py` → `AzureOpenAI` SDK | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_API_VERSION` |

Smoke-test Azure: `cd backend && uv run python test_azure.py`.

---

## API

| Method | Path | Description |
|---|---|---|
| `GET`  | `/health` | Liveness + pipeline/tracing status |
| `GET`  | `/api/components` | All renderable components + descriptions |
| `GET`  | `/api/scripts` | Generated + example script files on disk |
| `GET`  | `/api/checkpoints/{slug}` | Per-stage checkpoint status for a topic |
| `POST` | `/api/generate-script` | Run the pipeline → VideoScript JSON |
| `POST` | `/api/render` | Render a generated script to mp4 (background) |
| `GET`  | `/api/render/{job_id}` | Poll a render job |
| `GET`  | `/audio/<slug>.mp3` | Narration audio (when `enable_audio`) |
| `GET`  | `/renders/<slug>.mp4` | A finished render |

### `POST /api/generate-script` body

```jsonc
{
  "topic": "How TCP congestion control works",  // required
  "duration_seconds": 60,        // 10–1800 (up to 30 min)
  "style": "educational",        // educational | explainer | tutorial
  "enable_audio": false,         // Deepgram TTS + word-timed captions
  "render": false,               // also render to mp4 in the background
  "force_restart": false,        // ignore checkpoints and regenerate
  "fps": 30, "width": 1920, "height": 1080
}
```

---

## The VideoScript contract

The pipeline's output (and the frontend's input). Validated by `backend/models/video_script.py`.

```jsonc
{
  "title": "…", "fps": 30, "width": 1920, "height": 1080,
  "theme": { "primary": "#…", "secondary": "#…", "accent": "#…", "background": "#…", "font": "…" },
  "audio_url": "/audio/<slug>.mp3 | null",
  "voiceover": { "provider": "…|null", "captions": [ { "text": "…", "startMs": 0, "endMs": 900 } ] },
  "scenes": [
    {
      "id": "scene-1",
      "layout": "full | left-right | title-content | title-left-right | title-main-sidebar",
      "title": "…", "subtitle": "…",
      "duration_frames": 150,
      "transition": "fade | slideLeft | slideUp | zoom | none",
      "narration": "…",
      "panels": [ { "area": "left", "type": "<ComponentName>", "size_ratio": 1.8, "data": { /* per-component */ } } ]
    }
  ]
}
```

- Each panel's `type` is one of the components in `shared/componentCatalog.json` (see `GET /api/components`);
  its `data` matches that component's schema.
- **Frame budget:** `sum(scene.duration_frames) == duration_seconds * fps` (the backend enforces it).
- `size_ratio` sets a panel's relative width within its layout row (diagrams wider than text, etc.).

---

## Adding a scene component

Everything derives from one file — `frontend/src/registry.ts`:

1. Create `frontend/src/components/<Name>.tsx` (export the component **and** a Zod schema
   `export const <Name>Schema = z.object({…})`).
2. Add it to **all four** maps in `registry.ts` (`COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`,
   `COMPONENT_CATALOG`, `COMPONENT_META`). Set `dataOwner` (`"content"` → filled by the scriptwriter,
   `"visual"` → by the visual_architect).
3. `npm run catalog` to regenerate `shared/componentCatalog.json`.

The backend picks it up automatically from the regenerated catalog. Details in
[CLAUDE.md](./CLAUDE.md#adding-a-new-scene-component).

---

## Commands

**Frontend** (`frontend/`)

```bash
npm run dev        # Remotion Studio at :3000
npm run build      # bundle (regenerates catalog + examples first)
npm run lint       # eslint + tsc — the correctness gate (no test suite)
npm run catalog    # regenerate shared/componentCatalog.json from registry.ts
```

**Backend** (`backend/`)

```bash
uvicorn server:app --reload --port 8000   # API (fires the full pipeline per request)
python ask_server.py                       # Claude HTTP shim on :8080 (for LLM_BACKEND=ask)
python test_dry_run.py                     # pipeline wiring test with mocked LLM calls (no keys)
python ../test_pipeline.py                 # end-to-end generate_script() (needs a live LLM backend)
```

## Notes

- Run backend commands from **inside `backend/`** (imports are resolved via a `sys.path` insert in `server.py`).
- Re-running the same topic **resumes from checkpoints**; pass `force_restart: true` to regenerate.
- Generated/derived files (`shared/componentCatalog.json`, `frontend/src/generated/*`) are committed but
  produced from source — change `registry.ts` / examples and regenerate; don't hand-edit them.
