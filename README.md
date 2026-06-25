# AI-Powered Remotion Video Generator

Generate animated educational videos from a text topic. The backend calls Groq to produce a structured JSON "video script"; the Remotion frontend reads that JSON and renders the video — no human animation code required per video.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User / Client                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │  POST /api/generate-script
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              backend/server.py  (FastAPI)                       │
│                                                                 │
│  build_system_prompt(COMPONENTS)                                │
│          │                                                      │
│          ▼                                                      │
│  call_llm(prompt, system_prompt)                                │
│    ├─ Primary:  openai/gpt-oss-120b  via Groq                  │
│    └─ Fallback: compound-beta        via Groq                  │
│          │                                                      │
│          ▼                                                      │
│  validate JSON (scene types, frame sum)                         │
│          │                                                      │
│          ▼                                                      │
│  { script: VideoScript, meta: { model_used, fallback, ms } }   │
└───────────────────────────┬─────────────────────────────────────┘
                            │  JSON video script
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           frontend/src/DynamicVideo.tsx  (Remotion)             │
│                                                                 │
│  VideoScriptProps (inputProps)                                  │
│          │                                                      │
│          ▼                                                      │
│  ThemeProvider (injects theme into React context)               │
│          │                                                      │
│          ▼                                                      │
│  for each scene:                                                │
│    <Sequence from={cursor} durationInFrames={...}>              │
│      <SceneWrapper>                                             │
│        COMPONENT_REGISTRY[scene.type] {...scene.data}           │
│        + TransitionOverlay (15-frame fade/slide/zoom)           │
│      </SceneWrapper>                                            │
│    </Sequence>                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  Rendered MP4 / Remotion Studio
```

### Key Design Principle

The backend outputs **JSON only**. It never writes TypeScript or knows about Remotion internals. The frontend never calls the LLM. They communicate exclusively through the `VideoScript` JSON contract defined in `shared/videoScriptSchema.ts`.

---

## Running the Backend

### Prerequisites

```bash
pip install fastapi uvicorn groq pydantic
```

### Environment

```bash
export GROQ_API_KEY=gsk_...
# or create my-video/.env containing:
# GROQ_API_KEY=gsk_...
```

### Start the server

```bash
cd my-video/backend
uvicorn server:app --reload --port 8000
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Returns `{ status, models }` |
| `GET`  | `/api/components` | Lists available scene components and their props |
| `POST` | `/api/generate-script` | Generates a video script JSON |

#### Example generate request

```bash
curl -X POST http://localhost:8000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How Neural Networks Learn",
    "duration_seconds": 60,
    "style": "educational"
  }'
```

#### Example response

```json
{
  "script": {
    "title": "How Neural Networks Learn",
    "fps": 30,
    "width": 1920,
    "height": 1080,
    "theme": { "primary": "#7c3aed", "background": "#0b0f1e" },
    "scenes": [ ... ]
  },
  "meta": {
    "model_used": "openai/gpt-oss-120b",
    "fallback_triggered": false,
    "generation_time_ms": 1843
  }
}
```

### LLM Configuration

| Setting | Value | Where |
|---------|-------|-------|
| Primary model | `openai/gpt-oss-120b` | `backend/server.py → _PRIMARY_MODEL` |
| Fallback model | `compound-beta` | `backend/server.py → _FALLBACK_MODEL` |
| Full fallback chain | `gpt-oss-120b → compound-beta → llama-3.3-70b` | `backend/server.py → _MODEL_CHAIN` |

To change models, edit `_MODEL_CHAIN` in `backend/server.py`.

---

## Running the Frontend

### Prerequisites

```bash
cd my-video/frontend
npm install
```

### Remotion Studio (development)

```bash
npm run dev
# Opens http://localhost:3000
# Select "DynamicVideo" to preview the demo script
```

The `DynamicVideo` composition loads `shared/examples/demo.json` as its default props. You can paste any generated script into the Remotion Studio props panel.

### Render to MP4

```bash
npx remotion render DynamicVideo out/video.mp4 \
  --props='{"title":"...","scenes":[...]}'
```

---

## JSON Schema

Full TypeScript types live in `shared/videoScriptSchema.ts`.

### Top-level structure

```json
{
  "title": "string",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "theme": {
    "primary":    "#hex — main accent color",
    "secondary":  "#hex — complementary accent",
    "accent":     "#hex — highlight color",
    "background": "#hex — dark background",
    "font":       "Google Font name"
  },
  "scenes": [ ... ]
}
```

### Scene structure

```json
{
  "id": "unique-string",
  "type": "AnimatedTitle | ComparisonCard",
  "duration_frames": 90,
  "transition": "fade | slideLeft | slideUp | zoom | none",
  "data": { }
}
```

### AnimatedTitle data

```json
{
  "title":       "string (required)",
  "subtitle":    "string (optional)",
  "accentColor": "#hex (optional, default #38BDF8)",
  "align":       "\"center\" | \"left\" (optional, default \"center\")"
}
```

### ComparisonCard data

```json
{
  "title":        "string (required)",
  "pros":         ["string", ...],
  "cons":         ["string", ...],
  "accentColor":  "#hex (optional)",
  "visibleCount": "number (optional, default 99 = show all)"
}
```

### Frame budget rule

`sum(scene.duration_frames) == duration_seconds * 30`

The backend enforces this: if the LLM returns a mismatched sum, the last scene's duration is silently adjusted.

---

## How to Add a New Scene Component

Adding a new component is a four-step process — one logical change per step:

### Step 1 — Create the component

```tsx
// frontend/src/components/BulletList.tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export type BulletListProps = {
  heading: string;
  bullets: string[];
  accentColor?: string;
};

export const BulletList: React.FC<BulletListProps> = ({ heading, bullets, accentColor = "#38BDF8" }) => {
  const frame = useCurrentFrame();
  // ... animation using interpolate() with extrapolateLeft/Right: "clamp"
};
```

### Step 2 — Register it (one line in registry.ts)

```ts
// frontend/src/registry.ts
import { BulletList } from "./components/BulletList";

export const COMPONENT_REGISTRY = {
  AnimatedTitle,
  ComparisonCard,
  BulletList,  // ← add this line
} as const;
```

### Step 3 — Add it to the backend prompt (one block in server.py)

```python
# backend/server.py — inside COMPONENTS list
ComponentMeta(
    name="BulletList",
    description="Full-screen bullet list with staggered reveal.",
    props={
        "heading": "string (required) — section heading",
        "bullets": "string[] (required) — 3–6 bullet points",
        "accentColor": "string (optional) — hex color for bullets",
    },
),
```

### Step 4 — Add the TypeScript type (one union arm in videoScriptSchema.ts)

```ts
// shared/videoScriptSchema.ts
export type BulletListData = { heading: string; bullets: string[]; accentColor?: string };

// Extend the Scene union:
| { id: string; type: "BulletList"; duration_frames: number; transition: TransitionType; data: BulletListData }
```

That's it. The next call to `POST /api/generate-script` will include the new component in the Groq prompt automatically.

---

## Project Structure

```
my-video/
├── backend/
│   ├── server.py           ← FastAPI HTTP server (JSON generation)
│   ├── config.py           ← Groq keys, model names, paths
│   ├── agents/             ← 4-agent pipeline agents
│   └── utils/api.py        ← Groq chat_completion() with retry chain
│
├── frontend/
│   └── src/
│       ├── registry.ts         ← Component registry (extend here)
│       ├── DynamicVideo.tsx    ← JSON-driven Remotion composition
│       ├── ThemeContext.tsx    ← React context for JSON theme
│       ├── Root.tsx            ← Remotion composition registration
│       ├── components/         ← Scene component library
│       │   ├── AnimatedTitle.tsx
│       │   ├── ComparisonCard.tsx
│       │   ├── ScalingArrow.tsx
│       │   ├── ServerRack.tsx
│       │   ├── SceneLayout.tsx
│       │   ├── DataStream.tsx
│       │   ├── GlassPanel.tsx
│       │   └── GlowingNode.tsx
│       └── scenes/             ← Hand-crafted demo scenes
│
└── shared/
    ├── videoScriptSchema.ts    ← TypeScript types (source of truth)
    └── examples/
        └── demo.json           ← "How Neural Networks Learn" 60s demo
```
