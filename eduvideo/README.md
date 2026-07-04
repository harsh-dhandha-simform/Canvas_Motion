# EduVideo

Turns a topic + context into a finished interactive learning module: a rendered
educational video (narration, animated technical diagrams/code, baked-in transcript)
plus a concept-synced interaction panel, delivered as a React web player. The backend
(FastAPI) runs a 12-stage pipeline that writes one immutable JSON/media artifact per
stage under `jobs/<job_id>/`; a separate Revideo subproject renders video, and a
separate React (Vite) subproject (Phase 12) is the player.

**Current status: Module v1 complete** — the full 12-stage pipeline runs end to end,
topic in, a synced video + interaction learning module out.

## Setup

1. Copy `.env.example` to `.env` and fill in your provider keys:
   - `LLM_BASE_URL`/`LLM_API_KEY` (custom LLM proxy) and/or `AZURE_OPENAI_*` (fallback)
     — at least one is required to run the pipeline.
   - `DEEPGRAM_API_KEY` — required for voiceover.
   - `LANGFUSE_*` — optional, tracing degrades to no-op if absent.
2. Python backend: `uv sync` (installs from `pyproject.toml` into `.venv`).
3. Renderer subproject: `cd renderer && npm install` (also downloads Puppeteer's
   bundled Chromium — this can take a few minutes and ~300MB).
4. Player subproject: `cd player && npm install && npm run build` (builds the
   static player app into `player/dist/`, served by the API at `/player`; skip this
   and `GET /jobs/{id}/player` will 503 with instructions).

### Environment notes

- **Headless Chrome sandbox**: `renderer/render.ts` already passes `--no-sandbox
  --disable-setuid-sandbox` to Puppeteer, since most containerized/root
  environments (Docker, CI) don't grant Chrome's own OS sandbox the privileges it
  wants. This isn't a reduction in what's trusted — the renderer only ever loads
  our own scene code.
- **Puppeteer Chrome download flakiness**: if `npm install` doesn't fully fetch
  Puppeteer's pinned Chrome build (check `~/.cache/puppeteer/chrome/`), run
  `npx puppeteer browsers install chrome` from `renderer/`. If a specific pinned
  version's download is broken upstream, you can point at any other installed
  Chrome-for-Testing build via the `PUPPETEER_EXECUTABLE_PATH` env var — set it
  before starting the FastAPI server (it's inherited by the renderer subprocess).

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
  │
  ├─(1) content_analysis   → content_analysis.json   (LLM: topic → concepts, key points)
  ├─(2) script              → script.json              (LLM: narration sections per concept)
  ├─(3) storyboard          → storyboard.json           (LLM: sections → scenes/templates/props)
  ├─(4) voiceover            → voiceover.mp3 + timings.json   (Deepgram TTS, rotated voice)
  ├─(5) subtitles            → subtitles.json + scene_timings.json   (deterministic)
  ├─(6) concept_spine        → concepts.json            (deterministic: concept time windows)
  ├─(7) video_plan           → video_plan.json           (deterministic assembly)
  ├─(8) interactions         → interactions.json         (LLM: one widget per concept)
  ├─(9) validate             → (validates video_plan.json + interactions.json; 1x LLM repair on content errors)
  ├─(10) render              → rendered.mp4              (subprocess: renderer/render.ts, Revideo)
  └─(11) player              → player/module.json        (video URL + concepts + interactions, inlined)
```

Every stage reads only prior artifacts and writes exactly one new file under
`jobs/<job_id>/` — nothing is ever overwritten (see `app/jobs.py`), so any stage
can be re-run independently once its inputs exist.

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
| `main.py` | FastAPI app: `/health`, `/jobs`, `/jobs/{id}`, `/jobs/{id}/video`, `/jobs/{id}/module.json`, `/jobs/{id}/player`, mounts `/player` |
| `orchestrator.py` | `run_pipeline()` / `run_pipeline_from()` — runs stages in order |
| `jobs.py` | Job folder + immutable artifact read/write + manifest updates |
| `rerun.py` | `python -m app.rerun <job_id> --from <stage>` — re-run from a stage |
| `config.py` | `.env` + `config.yaml` → typed `Settings` |
| `clients/llm.py` | `LLMClient` — custom API primary, Azure GPT-4o fallback |
| `clients/tts.py` | `TTSClient` — Deepgram synthesis + proportional timing fallback |
| `clients/voice_rotation.py` | Round-robins the Deepgram voice across jobs |
| `clients/tracing.py` | Langfuse spans/generations, no-op if unconfigured |
| `agents/*.py` | One file per pipeline stage's LLM/deterministic logic |
| `validation/validator.py` | Full `video_plan.json`/`concepts.json` rule check + 1x repair |
| `render/adapter.py` | The ONLY module aware the renderer is Revideo |
| `player/builder.py` | Writes `player/module.json` (video URL + concepts + interactions) |
| `schemas/*.py` | Pydantic models — the contract for every artifact |

**Renderer subproject** (`renderer/`, Phase 9 — the only Revideo-aware code):
| File | Role |
|---|---|
| `render.ts` | Node entrypoint: reads a job dir, calls `renderVideo()`, writes `rendered.mp4` |
| `src/project.tsx` | Revideo scene: sequences plan scenes, subtitle overlay, audio |
| `src/templateRegistry.ts` | `template` string → scene renderer function |
| `src/scenes/*.tsx` | The 10 generic scene templates |
| `src/diagram/` | Diagram Engine: `flow`/`sequence`/`architecture` layouts |
| `src/code/` | Syntax-highlighted `CodeScene` (Lezer grammars) |
| `src/charts/` | `ChartScene` (bar/line) |
| `src/styles/designSystem.ts` | Theme → colors/fonts/spacing/motion tokens |
| `src/types.ts` | `VideoPlan` TS mirror of the Pydantic schema + runtime guard |

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
uv run python -m app.rerun <job_id> --from storyboard
uv run python -m app.rerun <job_id> --from storyboard --up-to video_plan  # stop early
```

## Testing

`tests/test_phaseN_*.py` are the end-of-phase smoke tests from the build log (each
runs a real job against the configured providers — not CI-fast, since they call
the real LLM/TTS APIs). Run any of them directly: `uv run python tests/test_phase8_validate.py`.
