# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI-powered generator that turns a text topic into an animated educational video. A Python multi-agent
pipeline (backend) emits a **VideoScript JSON**; a Remotion/React app (frontend) renders that JSON to
video. The two halves share nothing but the JSON contract — the backend never touches React/Remotion,
the frontend never calls an LLM.

> `README.md` (repo root) covers setup + usage; this file covers the deeper architecture. There are
> ~59 scene components and a LangGraph pipeline (researcher → director → scriptwriter ∥
> visual_architect → merge → validator → [tts] → assembler).

## Commands

### Frontend (`frontend/`, Remotion + React 19 + Tailwind v4)
```bash
npm install
npm run dev        # Remotion Studio at :3000 (runs catalog + register-examples first via predev)
npm run build      # remotion bundle (also regenerates catalog + examples via prebuild)
npm run lint       # eslint src && tsc  — this is the only typecheck/lint gate
npm run catalog          # regenerate shared/componentCatalog.json from registry.ts
npm run register-examples # regenerate src/generated/examples.generated.ts from shared/examples/*.json
npx remotion render DynamicVideo out/video.mp4 --props=<script.json>  # generic composition; size/duration from props
```
There is no frontend test suite; `npm run lint` (eslint + `tsc`) is the correctness gate.

### Backend (`backend/`, FastAPI + LangGraph, Python ≥3.10)
```bash
# deps are in backend/pyproject.toml (uv.lock present) — install with uv or pip
uvicorn server:app --reload --port 8000   # main API (fires the full pipeline per request)
python test_dry_run.py                     # pipeline wiring test with mocked agent LLM calls (no API keys)
python ../test_pipeline.py                 # end-to-end generate_script() call (needs a live LLM backend)
python test_azure.py                        # smoke-test the Azure OpenAI backend (needs AZURE_OPENAI_* in .env)
```
The default LLM backend is **`ask`** (see below), which requires `ask_server.py` running separately:
```bash
python ask_server.py   # HTTP shim on :8080 that shells out to the `claude` CLI
```
To expose the API publicly, `backend/serve_ngrok.sh` runs the backend + an ngrok tunnel (prints the
public URL; also starts `ask_server.py` when `LLM_BACKEND=ask`). `PORT` / `NGROK_DOMAIN` env vars override.

### Env
Copy `.env.example` → `.env` at repo root (auto-loaded by `config.py`). `LLM_BACKEND` picks the
transport (`ask` default | `groq` | `azure`): `GROQ_API_KEY` matters only for `groq`, `AZURE_OPENAI_*`
only for `azure`. `DEEPGRAM_API_KEY` only when `enable_audio=true`. Rendering knobs (`RENDER_*`,
`REMOTION_BROWSER_EXECUTABLE`) are optional — see "Rendering to mp4" below.

## Architecture

### The JSON contract is the whole design
`shared/componentCatalog.json` is the interface between the two halves. It is **generated** from
`frontend/src/registry.ts` by `npm run catalog` — never edit it by hand. The backend reads it (via
`backend/component_catalog.py`) to know which components exist, their JSON schema, and planning
metadata; it emits scenes referencing those component names; the frontend renders them.

Data flow:
```
registry.ts  --npm run catalog-->  shared/componentCatalog.json  -->  backend agents
backend pipeline  -->  VideoScript JSON  -->  frontend DynamicVideo.tsx  -->  video
```

### Backend: LangGraph multi-agent pipeline
Graph wired in `backend/graph/pipeline.py`; shared state is `backend/graph/state.py:PipelineState`
(a TypedDict — every node returns a partial dict that LangGraph merges in):

```
researcher → director → ┬─ scriptwriter ──┐
                        └─ visual_architect ┴→ merge → validator → [tts?] → assembler → END
```

- **LLM agents** live in `backend/agents/<name>/` as a trio: `agent.py` (prompt + LLM call),
  `node.py` (LangGraph wrapper + checkpoint load/save), `schema.py` (Pydantic I/O).
  - `researcher` → syllabus (subtopics, prereqs, depth)
  - `director` → scene blueprint: layout + panel slots + theme (picks components from the catalog)
  - `scriptwriter` (parallel) → fills **content** panels + narration
  - `visual_architect` (parallel) → fills **visual** panels + transitions
- **Pure-Python nodes** are in `backend/graph/nodes.py` (no LLM): `merge` combines the parallel
  branches by panel `area`, routing each panel's `data` to the scriptwriter or visual_architect
  output based on `dataOwner` (`backend/component_catalog.py:data_owner`); `validator`
  (`graph/validator.py`) repairs schemas + checks topic coverage; `tts` (optional, Deepgram) adds
  audio + word-timed captions; `assembler` wraps everything in the final `VideoScript` and validates
  it with `models/video_script.py` (Pydantic).
- **Fan-out/fan-in is disjoint**: scriptwriter and visual_architect fill *different* panels, so merge
  has no conflict. When adding a component, its `dataOwner` decides which agent must produce its data.
- **Checkpointing**: every node caches its output per stage under a `checkpoint_slug` (topic+duration).
  Re-running the same topic resumes from cache; pass `force_restart=true` to clear. Stages:
  `syllabus, plan, script, story, scenes, validation_report, video_script`.
- **Timing** (`utils/timing.py`) deterministically scales scene `duration_frames` to the requested
  duration, respecting each component's `minSeconds` floor. `server.py` does a final frame-sum fixup.
- **Invocation & context**: `server.py` runs the graph synchronously for `POST /api/generate-script`,
  or in a background thread (`graph/jobs.py`) for `POST /api/generate-script/async` — poll
  `GET /api/generate-script/status/{job_id}` for coarse per-stage progress + the final script. The
  optional request `context` is threaded through `PipelineState` into the researcher + director prompts.

### LLM transport is swappable (`config.py:LLM_BACKEND`)
- `ask` (default): every agent call goes through `utils/ask_client.py` → `ask_server.py` → the local
  `claude` CLI (model `opus`). This is how the pipeline runs without paid API keys.
- `groq`: `utils/api.py` walks a rate-limit-aware model chain on Groq (`utils/rate_limiter.py`).
- `azure`: `utils/azure_client.py` calls Azure OpenAI via the `AzureOpenAI` SDK (deployment from
  `AZURE_OPENAI_DEPLOYMENT_NAME`). All three are dispatched from `utils/api.py:chat_completion`.

Optional Langfuse tracing via `utils/tracing.py` (`@observe`), enabled when Langfuse env vars are set.

### Rendering to mp4 (`backend/render/`)
Separate from the LangGraph graph (not a node). A generated VideoScript is turned into video with
`npx remotion render`: `render/adapter.py` (engine dispatch, only `remotion`) → `render/remotion_adapter.py`
(writes a props file, shells out to the frontend's generic `DynamicVideo` composition) →
`backend/renders/<slug>.mp4`. `render/jobs.py` runs renders in a background daemon thread with in-memory
status. Triggered by `POST /api/render {slug|topic}` (poll `GET /api/render/{job_id}`) or `render:true`
on `/api/generate-script`. Narration audio is fetched over HTTP from the running API
(`/audio/<slug>.mp3`), so the server must be up during a render; `npx remotion` needs the frontend's
`node_modules` + a Chrome (set `REMOTION_BROWSER_EXECUTABLE` in sandboxes).

### Frontend: registry.ts is the single source of truth
`frontend/src/registry.ts` declares, for every component, four things in lockstep:
- `COMPONENT_REGISTRY` — name → React component (used by `DynamicVideo.tsx` at render time)
- `COMPONENT_SCHEMAS` — name → Zod schema
- `COMPONENT_CATALOG` — name → `{ description, schema }` (schema via `zod-to-json-schema`)
- `COMPONENT_META` — planning metadata the LLM needs but Zod can't express:
  `category, dataOwner ("content"|"visual"), bestAreas, useWhen, tags, minSeconds`

`build-catalog.ts` merges CATALOG + META per component into `componentCatalog.json`. A missing META
entry is a hard error at catalog build.

`DynamicVideo.tsx` renders each scene into a CSS-grid `layout` (5: `full`, `left-right`,
`title-content`, `title-left-right`, `title-main-sidebar`). Each scene has
`panels: [{ area, type, size_ratio?, data }]`; `PanelCell` looks up the component in
`COMPONENT_REGISTRY` and drops it into its grid `area`. Column widths come from each panel's
`size_ratio` (or its component category) via `layout.ts`, and `PanelCell` passes each cell's pixel size
through `PanelSizeContext` so components size to their cell (`usePanelSize()`), not the full canvas. The
theme's `primary` color is injected as the default `accentColor`. Scenes cross-dissolve into each other
(opacity crossfade in `SceneWrapper`, no timeline compression, so audio/captions stay synced);
`CaptionLayer.tsx` draws word-timed captions at the composition root. `normaliseScene()` still accepts
the legacy single `{type,data}` shape.

`Root.tsx` registers one `<Composition>` per generated example (from `examples.generated.ts`) plus a
generic `DynamicVideo` composition whose `calculateMetadata` derives duration/fps/size from `--props` —
that generic one is what the backend render pipeline targets.

## Adding a new scene component

1. Create `frontend/src/components/<Name>.tsx` exporting both the component and a Zod schema
   (`export const <Name>Schema = z.object({...})`). Follow an existing component for animation idiom
   (`useCurrentFrame` + `interpolate(..., {extrapolateLeft/Right: "clamp"})`, helpers in
   `components/_shared/anim.ts`).
2. In `frontend/src/registry.ts`, add the import and an entry to **all four** maps
   (`COMPONENT_REGISTRY`, `COMPONENT_SCHEMAS`, `COMPONENT_CATALOG`, `COMPONENT_META`). This is the
   only place — the backend catalog, backend registry, and validation all regenerate from here.
3. Run `npm run catalog` (or just `npm run dev`/`build`) to regenerate `shared/componentCatalog.json`.
4. Pick `dataOwner` deliberately: `"content"` → the scriptwriter fills its `data`; `"visual"` → the
   visual_architect does. Everything downstream is automatic.

## Conventions

- The frame budget rule holds: `sum(scene.duration_frames) == duration_seconds * fps`. The backend
  enforces it (timing + a last-scene fixup in `server.py`).
- Generated files are committed but derived — don't hand-edit `shared/componentCatalog.json`,
  `frontend/src/generated/*`. Change the source (`registry.ts`, `shared/examples/*.json`) and rerun.
- `shared/examples/*.json` are curated demos (committed); `shared/generated/*.json` are per-request
  pipeline outputs (gitignored). `register-examples` scans both, so both preview in Studio.
- Backend imports are bare (`from graph...`, `from utils...`), resolved by `server.py` inserting
  `backend/` onto `sys.path`. Run backend commands from inside `backend/`.
