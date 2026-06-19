# 🎬 AI Video Production Studio

An automated, LLM-powered video generation pipeline using **Groq** + **Remotion**.

## 🌊 The End-to-End Flow

The system operates as an autonomous production studio. Here is exactly what happens when you run the pipeline:

### 1. User Input
You trigger the pipeline by running the orchestrator with a topic:
`uv run python main.py "How Docker Containers Work"`

### 2. The 6-Agent AI Backend Pipeline
The backend uses a sequential 6-agent architecture. Each agent passes its structured JSON output to the next:

- **🕵️ Agent 1: Director**
  Analyzes the topic and decides the visual tone, color palette, typography (Google Fonts), and outlines the high-level scene structure.
- **✍️ Agent 2: Scriptwriter**
  Takes the Director's brief and writes a scene-by-scene voiceover narration and generates concise bullet points to display on-screen.
- **🎵 Agent 3: Audio Designer**
  Selects background music styles (BPM/genre) and maps sound effect (SFX) markers to key scene events (e.g., scene transitions).
- **🎨 Agent 4: Storyboard Artist**
  Designs the visual layout for every scene. It decides where text, icons, and custom inline SVG diagrams should be placed and how they animate (e.g., `fade-in`, `slide-up`).
- **⏱️ Agent 5: Sync Specialist**
  Takes the script length and calculates frame-accurate timing for the entire video at 30 FPS. It computes the exact `start_frame` and `durationInFrames` for each scene and subtitle word-chunk.
- **💻 Agent 6: Code Generator**
  The final and most complex agent. It consumes the complete context bundle from all 5 previous agents and generates **pure React/TypeScript code**. 
  
  Unlike traditional AI generators that output one massive file, this agent outputs modular XML blocks that our pipeline parses into separate files:
  - `data.ts` (Script and variables)
  - `components/` (Reusable SVGs and graphic elements)
  - `scenes/` (Individual scene compositions)
  - `GeneratedVideo.tsx` (The main sequence timeline)

### 3. File Writing & Frontend Patching
The Python orchestrator (`main.py`):
1. Parses the XML output from the Code Generator.
2. Writes all the modular files into the `frontend/src/generated/` directory.
3. Automatically patches `frontend/src/Root.tsx` to point to the newly generated `GeneratedVideo` composition and updates the video duration to match the AI's timing calculations.

### 4. Remotion Frontend Rendering
The Remotion frontend (`npm run dev`) automatically detects the changes to the React code via hot-module reloading and immediately renders the new AI-generated video in the browser at `http://localhost:3000`.

---

## 🏗️ Architecture

```text
my-video/
├── frontend/                     # Remotion React project
│   ├── src/
│   │   ├── generated/            ← Modular files written by AI pipeline
│   │   │   ├── data.ts
│   │   │   ├── components/
│   │   │   ├── scenes/
│   │   │   └── GeneratedVideo.tsx
│   │   └── Root.tsx              ← Updated by pipeline to match duration
│   └── package.json
│
└── backend/                      # Python AI Pipeline
    ├── pyproject.toml            ← UV dependency management
    ├── main.py                   ← Orchestrator entry point
    ├── config.py                 ← Settings & paths
    ├── agents/
    │   ├── director.py           
    │   ├── scriptwriter.py       
    │   ├── audio_designer.py     
    │   ├── storyboard.py         
    │   ├── sync.py               
    │   └── code_generator.py     
    └── utils/
        ├── api.py                ← Groq wrapper with rate-limit backoff
        └── shell.py              ← Subprocess runner
```

---

## 🚀 Quick Start

### 1. Set your Groq API key
```bash
export GROQ_API_KEY=gsk_...
```

### 2. Install Backend Dependencies
We use `uv` for blazing-fast dependency management:
```bash
cd backend
uv sync
```

### 3. Install Frontend Dependencies & Start Studio
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

### 4. Generate a Video
From the `backend` directory, run the pipeline:
```bash
uv run python main.py "Consistent Hashing"
```

Watch your Remotion Studio browser window update automatically once the script finishes!

---

## ⚙️ Options & Rate Limits

```bash
uv run python main.py "Your Topic" --skip-audio
```
- `--skip-audio` — Skips the Audio Designer agent for faster testing iterations.

**Rate Limit Handling:**
The pipeline natively handles Groq RPM/TPM limits via:
- Exponential backoff (5s → 10s → 20s) with jitter on HTTP 429
- 2s pause between agent executions
- Graceful degradation to a fallback model (`llama-3.1-8b-instant`) if retries are exhausted.

## 🐛 Debugging
Pipeline context (all agent JSON outputs) is saved to:
`backend/debug/context_<topic>.json`
