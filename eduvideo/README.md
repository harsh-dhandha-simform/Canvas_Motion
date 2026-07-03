# EduVideo

Turns a topic + context into a finished interactive learning module: a rendered
educational video (narration, animated technical diagrams/code, baked-in transcript)
plus a concept-synced interaction panel, delivered as a React web player. The backend
(FastAPI) runs a 12-stage pipeline that writes one immutable JSON/media artifact per
stage under `jobs/<job_id>/`; a separate Revideo subproject renders video, and a
separate React (Vite) subproject is the player.

## Running (Phase 1: config + health check only)

1. Copy `.env.example` to `.env` and fill in whichever provider keys you have
   (custom LLM, Azure OpenAI, Deepgram, Langfuse are all optional at this stage).
2. `uv sync` (installs dependencies from `pyproject.toml` into `.venv`).
3. `uv run uvicorn app.main:app --reload`
4. `GET /health` to check client connectivity.
