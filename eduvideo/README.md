# EduVideo

Turns a topic + context into a finished interactive learning module: a rendered
educational video (narration, rich multi-panel diagrams/charts/code from a 34-component
library, keyword-highlighted captions) plus a concept-synced interaction panel,
delivered as a React web player. The backend (FastAPI) runs a **LangGraph multi-agent
engine** followed by classic tail stages, writing one immutable JSON/media artifact per
stage under `jobs/<job_id>/`; a **Remotion** subproject (`renderer_remotion/`) renders
the video, and a separate React (Vite) subproject is the player.

**Current status: engine v2 complete** — the LangGraph engine (researcher → director →
scriptwriter ∥ visual_architect → merge → validator → voiceover → assembler) emits the
native rich VideoScript the Remotion renderer consumes, then the tail derives the
concept spine, plans interactions, validates, renders, and builds the player module.
Structured `loguru` logs (job-id tagged) run throughout.

## Setup

1. Copy `.env.example` to `.env` and fill in your provider keys:
   - `LLM_BASE_URL`/`LLM_API_KEY` (custom LLM proxy) and/or `AZURE_OPENAI_*` (fallback)
     — at least one is required to run the pipeline.
   - `DEEPGRAM_API_KEY` — enables voiceover + real word-level caption/scene timing.
     Optional: without it the video renders **silent** with estimated timing.
   - `LANGFUSE_*` — optional, tracing degrades to no-op if absent.
2. Python backend: `uv sync` (installs from `pyproject.toml` into `.venv`).
3. Renderer subproject: `cd renderer_remotion && npm install`, then
   **`npm run catalog`** — this regenerates `shared/componentCatalog.json` (the 34
   components' JSON-Schemas) that the engine's agents and validator read. The pipeline
   will not produce valid scenes without it.
4. Player subproject: `cd player && npm install && npm run build` (builds the
   static player app into `player/dist/`, served by the API at `/player`; skip this
   and `GET /jobs/{id}/player` will 503 with instructions).

### Environment notes

- **Provided Chrome for rendering**: Remotion downloads its own headless Chrome on
  first render. In sandboxed/corporate networks that can't reach the download host,
  set `REMOTION_BROWSER_EXECUTABLE` to an existing Chrome binary (e.g.
  `/usr/bin/google-chrome`) before starting the server — the render adapter passes it
  through as `--browser-executable`, skipping the download.
- **Corporate TLS proxies (e.g. Zscaler)**: if Deepgram/Remotion calls fail with
  `CERTIFICATE_VERIFY_FAILED`, Python's bundled `certifi` doesn't trust the proxy's
  root CA that the OS store carries — point Python at the OS bundle with
  `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt`.

## Running

```bash
uv run uvicorn app.main:app --reload
```

- `GET /health` — checks LLM/TTS/Langfuse connectivity.

## Generating a module

```bash
curl -X POST http://localhost:8000/jobs \
  -H 'Content-Type: application/json' \
  -d '{"topic": "TCP three-way handshake for undergrad CS students", "durationSec": 90, "includeQuiz": true}'
# => {"job_id": "..."}

curl http://localhost:8000/jobs/<job_id>          # poll until status == "completed"
curl http://localhost:8000/jobs/<job_id>/video -o out.mp4   # once complete

open http://localhost:8000/jobs/<job_id>/player   # or paste the URL in a browser
```

`POST /jobs` returns immediately; the pipeline runs in a background thread (v1 —
no external queue) through ALL stages, including `player`. `GET /jobs/{id}` returns
the job manifest: `status` (`queued`/`running`/`completed`/`failed`), `stage`
(whichever stage is currently running), `stages_done`, and `error` (set if
`status=failed`). `GET /jobs/{id}/player` redirects to the shared player app
preloaded with that job (`/player/?job=<id>`).

## The pipeline

```
topic + context
  │  ── LangGraph generation engine (app/engine/, in-memory graph; each node persists its artifact) ──
  ├─(1) researcher         → syllabus.json        (LLM: topic → subtopics, key terms, misconceptions)
  ├─(2) director           → plan.json            (LLM: syllabus → scene/panel layout plan)
  ├─(3) scriptwriter  ∥    → script.json          (LLM: content-owner panel data — parallel branch A)
  ├─(3) visual_architect ∥ → story.json           (LLM: visual-owner panel data — parallel branch B)
  ├─(4) merge              → merge.json           (deterministic: combine branches, provisional timing)
  ├─(5) validator          → validation.json      (per-panel JSON-Schema check → 1x LLM repair → degrade)
  ├─(6) voiceover          → voiceover.mp3        (Deepgram TTS + Nova-2 STT: real scene timing +
  │                          + captions            keyword-highlight captions; no-ops silent if audio off)
  ├─(7) assembler          → video_script.json    (native VideoScript envelope) + scenes_timed.json
  │  ── classic tail stages (app/agents, app/render, app/player) ──
  ├─(8) concept_spine      → concepts.json        (deterministic: group scenes by primary concept → windows)
  ├─(9) interactions       → interactions.json    (LLM: one widget per concept, reusing scene panels)
  ├─(10) validate          → (concepts contiguity + interactions coverage/props + sandbox; 1x repair)
  ├─(11) render            → rendered.mp4         (Remotion: renderer_remotion, native VideoScript)
  └─(12) player            → player/module.json   (video URL + concepts + interactions, inlined)
```

Every stage reads only prior artifacts and writes exactly one new file under
`jobs/<job_id>/` — nothing is ever overwritten (see `app/jobs.py`), so any stage
can be re-run independently once its inputs exist. The engine graph always runs from
its entry point on rerun; nodes upstream of the re-run stage return their cached
artifact (no recompute), so `--from <graph stage>` recomputes only the downstream
closure.

## The player: two-region UX + concept sync

The player (`player/`, a small React + Vite app, built once and shared across every
job) opens at `/player/?job=<id>` and loads that job's `module.json`:

- **Video (left)** plays `rendered.mp4` — narration, animated diagrams/code, and the
  transcript are already baked into the video itself; the player does not render a
  separate transcript region.
- **Interaction panel (right)** slides in/out via a top-right toggle button
  (animated, non-blocking — the video keeps playing while the panel opens/closes).
- **Concept sync** (`player/src/conceptSync.ts`): the `<video>` element's
  `currentTime` is the single source of truth. On every `timeupdate`/`seeking`
  event, the player finds the concept whose `[start, end)` window (from
  `concepts.json`) contains the current time and looks up that concept's widget
  (from `interactions.json`). When the active concept changes — including on a
  backward/forward seek — the panel swaps to the new widget with a fade transition;
  it does not swap while playback stays within the same concept.
- **Widgets** (`player/src/widgets/`): `step_through`, `quiz`, `param_explorer`,
  `flashcards`, `diagram_explore` (a lightweight SVG diagram), and `code_playground`
  (runs JS in a sandboxed Web Worker with `fetch`/`XHR`/`WebSocket` disabled).
  `custom` interactions run in a sandboxed `<iframe sandbox="allow-scripts">` with no
  `allow-same-origin` and a `default-src 'none'` CSP (`player/src/sandbox/`) — this
  is the runtime enforcement layer behind Phase 11's static sandbox validation.

## File map

**Python backend** (`app/`):
| File | Role |
|---|---|
| `main.py` | FastAPI app: `/health`, `/jobs`, `/jobs/{id}`, `/jobs/{id}/video`, `/jobs/{id}/module.json`, `/jobs/{id}/player`, mounts `/player`; calls `setup_logging()` |
| `orchestrator.py` | `run_pipeline()` / `run_pipeline_from()` — streams the engine graph then runs the tail stages |
| `logging_config.py` | loguru setup + stdlib-logging intercept (every log tagged with `job_id`) |
| `engine/pipeline.py` | The LangGraph `StateGraph` (`compiled_graph`) and its edges |
| `engine/state.py` | `PipelineState` (job-id based) |
| `engine/nodes.py` | Deterministic nodes: merge, validator, **voiceover** (real STT timing + highlight captions), assembler |
| `engine/agents/*/` | researcher / director / scriptwriter / visual_architect (`agent.py` + `node.py` + `schema.py`) |
| `engine/catalog.py` | Component-catalog accessor over `shared/componentCatalog.json` (34 components) |
| `engine/{shortlister,timing,captions,graph_validator}.py` | Component shortlist, scene timing, caption chunking, per-panel schema repair |
| `engine/models/` | `VideoScript`/`Scene`/`Panel`/`Caption` (+ `highlight`) and merge models |
| `engine/{llm,persistence}.py` | LLM wrapper over `LLMClient`; node↔job-artifact cache/persist bridge |
| `jobs.py` | Job folder + immutable artifact read/write (`write_json_artifact`/`read_json_artifact`) + manifest |
| `rerun.py` | `python -m app.rerun <job_id> --from <stage>` — re-run from a stage |
| `config.py` | `.env` + `config.yaml` → typed `Settings` (+ `catalog_path`) |
| `clients/tts.py` | `TTSClient` — Deepgram synthesis + `transcribe()` Nova-2 STT for real word timings |
| `agents/concept_spine.py` | Derives the concept spine from `syllabus` + `scenes_timed` |
| `agents/interaction_planner.py` | One widget per concept, reusing each concept's scene panels |
| `validation/validator.py` | Tail validator: concepts contiguity + interactions coverage/props + sandbox + 1x repair |
| `render/adapter.py` → `render/remotion_adapter.py` | Engine dispatch → renders native `video_script.json` via Remotion |
| `player/builder.py` | Writes `player/module.json` (video URL + concepts + interactions) |
| `schemas/*.py` | Pydantic models for the tail/learning-module artifacts |

**Renderer subproject** (`renderer_remotion/`, Remotion — consumes the native VideoScript):
| File | Role |
|---|---|
| `src/Root.tsx` | Registers the `EduVideo` composition (`calculateMetadata` sums scene frames) |
| `src/DynamicVideo.tsx` | Renders a VideoScript: scenes → multi-panel layouts, audio, `CaptionLayer` |
| `src/registry.ts` | `type` → React component for all 34 components; source of `npm run catalog` |
| `src/components/*` | The 34 components (diagrams, charts, algorithm visualizers, code, math, …) |
| `src/components/CaptionLayer.tsx` | Bottom caption pill; per-word keyword highlight (bold + accent) |
| `shared/componentCatalog.json` | Generated component JSON-Schemas the Python engine reads |

**Player subproject** (`player/`, Phase 12 — built once, shared by every job):
| File | Role |
|---|---|
| `src/main.tsx` | Entry: reads `?job=<id>`, loads + validates `module.json`, mounts `Player` |
| `src/module.ts` | Fetches `module.json`, runtime-validates against `Concepts`/`Interactions` |
| `src/Player.tsx` | Two-region layout: video left, slide-in panel right, toggle button |
| `src/conceptSync.ts` | Maps `<video>.currentTime` → the active `ConceptWindow` |
| `src/InteractionPanel.tsx` | Renders the active concept's widget, cross-fades on change |
| `src/widgets/registry.tsx` | `type` → widget component (library widgets + `custom`) |
| `src/widgets/*.tsx` | `step_through`, `quiz`, `param_explorer`, `flashcards`, `diagram_explore`, `code_playground`, `data_structure` |
| `src/sandbox/codeRunner.ts` | Runs `code_playground` JS in an isolated Web Worker |
| `src/sandbox/SandboxHost.tsx` | Mounts `custom` interactions in a sandboxed, no-network iframe |
| `src/styles/designSystem.ts` | Player-side design tokens, matched to the video's `dark_matte` theme |
| `src/types.ts` | `Concepts`/`Interactions` TS mirror of the Pydantic schemas |

## Re-running a stage

Re-runs from a stage using its cached upstream artifacts (no need to redo earlier
LLM calls or re-render if only fixing e.g. the storyboard):

```bash
uv run python -m app.rerun <job_id> --from director            # recompute director→…→player
uv run python -m app.rerun <job_id> --from interactions --up-to validate  # stop early
```

Stage names: `researcher director scriptwriter visual_architect merge validator
voiceover assembler concept_spine interactions validate render player`.

## Testing

`tests/test_*.py` are plain runnable scripts (`uv run python tests/test_<name>.py`).
Deterministic units (`test_json_artifacts`, `test_catalog`, `test_timing`,
`test_concept_spine`, `test_validator`) need no network. Integration tests
(`test_agents_chain`, `test_graph_invoke`, `test_interaction_planner`) hit the real
LLM proxy; `test_tts_stt`/`test_voiceover_node` also require Deepgram.
