"""
backend/agents/code_generator.py — Agent 6: React TSX Code Generator

Generates a complete, modular, production-quality React/TypeScript Remotion project
by calling the model step-by-step for each file, checking for existing files on disk
to support resumption and fine-grained caching.
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, Any

from config import GENERATED_DIR, GROQ_MODEL, VIDEO_DURATION_FRAMES, VIDEO_FPS
from utils.api import chat_completion

logger = logging.getLogger(__name__)

AGENT_NAME = "CodeGenerator"

# ---------------------------------------------------------------------------
# System prompts for different steps
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_DATA = """
You are an elite React / TypeScript / Remotion engineer.
Your job is to generate `data.ts` and `components/Palette.ts` containing all script, timing, and palette constants.

@file:remotion-best-practices

=== CRITICAL FONT RULES ===
In data.ts:
Import loadFont from "@remotion/google-fonts/Inter" for FONT:
  import { loadFont } from "@remotion/google-fonts/Inter";
  export const FONT = loadFont();

Import loadFont from "@remotion/google-fonts/FiraCode" for CODE_FONT:
  import { loadFont as loadCodeFont } from "@remotion/google-fonts/FiraCode";
  export const CODE_FONT = loadCodeFont();

Do NOT pass any options object (like family or weight) to loadFont(). Call it with no arguments.

=== CRITICAL PALETTE RULES ===
In components/Palette.ts, export a single PALETTE object with EXACTLY these camelCase keys:
export const PALETTE = {
  background: "#0a0e1a",
  primary: "#7c3aed",
  secondary: "#f59e0b",
  text: "#e5e7eb",
  muted: "#6b7280",
  codeBg: "#1e293b",
  highlight: "#34d399",
  success: "#10b981",
  danger: "#ef4444",
} as const;

Output the files using this exact XML format:
<file path="data.ts">
// file content here
</file>
<file path="components/Palette.ts">
// file content here
</file>
""".strip()

SYSTEM_PROMPT_SCENE = """
You are an elite React / TypeScript / Remotion engineer and a systems visualization expert.
Your job is to generate a single, self-contained Scene component file that displays a specific scene of the video.
This Scene component must handle its own layout, text rendering, and technical system design animations.

@file:remotion-best-practices

=== DESIGN & LAYOUT REQUIREMENTS ===
1. The resolution of the composition is 1920x1080.
2. Background must be dark (#0a0e1a). Use PALETTE.background or Tailwind bg-slate-950/bg-slate-900.
3. Use Tailwind CSS classes for all styling (positioning, padding, flexbox layout, font sizing, borders, rounded corners, shadows). Do NOT use plain/generic CSS files or local classes.
4. Structure the page beautifully:
   - Header: Render the Scene title and subtitle at the top-left using the `<AnimatedTitle>` component.
   - Main content: Use a two-column or split layout.
     - Left Panel (width ~40%): Render the staggered key points (bullet list) and a code block (if a code snippet is provided).
     - Right Panel (width ~60%): Render the animated systems diagram (using standard components like ServerRack/ScalingArrow, or custom inline animated SVG elements).
5. Animations must be driven by `useCurrentFrame()`, `interpolate()`, and `spring()` from 'remotion'. Avoid static placeholders. Make the diagrams feel alive, premium, and responsive.
6. The Scene component must accept props: `{ frame?: number; fps?: number; }` so it can be previewed or rendered.
7. Export the Scene component as a DEFAULT export (e.g. `export default Scene0;` or `export default Scene1;`).

=== REUSABLE COMPONENTS & STRICTOR TYPES ===
You have access to the following pre-built components. You MUST import them and use them to construct your scene layout and system diagrams. Do NOT pass any props other than those listed:

- **`AnimatedTitle`** (named import from `../../components/AnimatedTitle`):
  `import { AnimatedTitle } from "../../components/AnimatedTitle";`
  Allowed props:
    * `title: string` (required)
    * `subtitle?: string` (optional)
    * `accentColor?: string` (optional)
    * `align?: "center" | "left"` (optional)
  Do NOT pass `className` or any other prop.

- **`ServerRack`** (named import from `../../components/ServerRack`):
  `import { ServerRack } from "../../components/ServerRack";`
  Allowed props:
    * `scale: number` (required)
    * `label?: string` (optional)
    * `cpu?: string` (optional, e.g. "4 cores", "8 cores")
    * `ram?: string` (optional, e.g. "16 GB", "32 GB")
    * `isActive?: boolean` (optional)
    * `isLoadBalancer?: boolean` (optional)
    * `color?: string` (optional)
  Do NOT pass `x`, `y`, `className`, or any other prop. To position a ServerRack absolutely, wrap it in a container div with style:
  `<div style={{ position: "absolute", left: X, top: Y }}><ServerRack ... /></div>`

- **`ScalingArrow`** (named import from `../../components/ScalingArrow`):
  `import { ScalingArrow } from "../../components/ScalingArrow";`
  Allowed props:
    * `from: { x: number; y: number }` (required)
    * `to: { x: number; y: number }` (required)
    * `color?: string` (optional)
    * `progress?: number` (optional, 0 to 1)
    * `animateFlow?: boolean` (optional)
    * `flowSpeed?: number` (optional)
    * `arrowHeadSize?: number` (optional)
  Do NOT pass `className` or any other prop.

- **`ComparisonCard`** (named import from `../../components/ComparisonCard`):
  `import { ComparisonCard } from "../../components/ComparisonCard";`
  Allowed props:
    * `title: string` (required)
    * `pros: string[]` (required)
    * `cons: string[]` (required)
    * `accentColor?: string` (optional)
    * `visibleCount?: number` (optional)
  Do NOT pass `className` or any other prop.

=== NO CONTEXT VARIABLES OR UNKNOWN PROPS ===
1. All narration texts, bullet points, titles, and subtitles MUST be hardcoded as local variables or string literals in the TSX code. Do NOT try to access a global/local `context` variable or props like `director_brief`, `scene_storyboard`, etc. They do not exist.
2. Only import components from the listed paths.
3. Every component file MUST export the Scene component as a default export (e.g. `export default Scene0;` or `export default Scene1;` depending on the scene index).
4. Do NOT use properties on PALETTE that do not exist (only background, primary, secondary, text, muted, codeBg, highlight, success, danger exist).
5. All animations should be smooth and use `useCurrentFrame()` and `interpolate()` or `spring()`.

=== COLOR PALETTE ===
Import the `PALETTE` constant from `../components/Palette`:
`import { PALETTE } from "../components/Palette";`
Use ONLY the following keys defined in PALETTE:
- `PALETTE.background`
- `PALETTE.primary`
- `PALETTE.secondary`
- `PALETTE.text`
- `PALETTE.muted`
- `PALETTE.codeBg`
- `PALETTE.highlight`
- `PALETTE.success`
- `PALETTE.danger`
Do NOT use properties like PALETTE.gray, PALETTE.blue, PALETTE.white, etc., as they do not exist.

=== CRITICAL MARKDOWN RULES ===
Do NOT wrap the TSX code block inside markdown backticks (like ```tsx or ```) inside the `<file>` tags. Output raw, clean code directly between `<file path="...">` and `</file>`.

Output the file using this exact XML format:
<file path="scenes/SceneN.tsx">
// clean TSX file content here (no markdown ticks!)
</file>
""".strip()


SYSTEM_PROMPT_VIDEO = """
You are an elite React / TypeScript / Remotion engineer.
Your job is to generate the main GeneratedVideo.tsx component that sequences all scenes using Remotion's <Sequence> tags.
It must import all scenes (e.g. import Scene1 from "./scenes/Scene1") as default imports.
It must import AbsoluteFill and Sequence from 'remotion';
It must import SCENE_TIMINGS from './data';
It must compile cleanly and export a named GeneratedVideo component.

=== SEQUENCE MAPPING ===
Important: The scenes are 1-indexed (Scene1, Scene2, ..., Scene10), but SCENE_TIMINGS in data.ts is 0-indexed.
Therefore, map Scene1 to SCENE_TIMINGS[0], Scene2 to SCENE_TIMINGS[1], and so on.
Example structure:
```tsx
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import Scene1 from './scenes/Scene1';
import Scene2 from './scenes/Scene2';
import { SCENE_TIMINGS } from './data';

export const GeneratedVideo: React.FC = () => {
  return (
    <AbsoluteFill className="bg-slate-950 text-white font-sans overflow-hidden">
      <Sequence from={SCENE_TIMINGS[0].start_frame} durationInFrames={SCENE_TIMINGS[0].duration_frames}>
        <Scene1 />
      </Sequence>
      <Sequence from={SCENE_TIMINGS[1].start_frame} durationInFrames={SCENE_TIMINGS[1].duration_frames}>
        <Scene2 />
      </Sequence>
      ...
    </AbsoluteFill>
  );
};
```

Do NOT wrap the TSX code block inside markdown backticks inside the `<file>` tag.

Output the file using this exact XML format:
<file path="GeneratedVideo.tsx">
// clean TSX file content here
</file>
""".strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_agent(
    director_brief: dict,
    script: dict,
    audio_design: dict,
    storyboard: dict,
    timing: dict,
) -> str:
    """
    Run the Code Generator agent and write the output files to disk step-by-step.
    Uses disk caching to skip already generated files and prevent token limits.
    """
    logger.info("[%s] Starting modular React TSX generation...", AGENT_NAME)

    # 1. Generate data.ts and Palette.ts
    data_path = GENERATED_DIR / "data.ts"
    palette_path = GENERATED_DIR / "components/Palette.ts"
    if not data_path.exists() or not palette_path.exists():
        logger.info("[%s] Generating data.ts and Palette.ts programmatically...", AGENT_NAME)
        
        # 1a. Write Palette.ts
        palette = director_brief.get("palette", {})
        palette_content = f"""// Generated by AI Video Production Pipeline
export const PALETTE = {{
  background: "{palette.get("background", "#0a0e1a")}",
  primary: "{palette.get("primary", "#7c3aed")}",
  secondary: "{palette.get("secondary", "#f59e0b")}",
  text: "{palette.get("text", "#e5e7eb")}",
  muted: "{palette.get("muted", "#6b7280")}",
  codeBg: "{palette.get("code_bg", palette.get("codeBg", "#1e293b"))}",
  highlight: "{palette.get("highlight", "#34d399")}",
  success: "{palette.get("success", "#10b981")}",
  danger: "{palette.get("danger", "#ef4444")}",
}} as const;
"""
        palette_path.parent.mkdir(parents=True, exist_ok=True)
        palette_path.write_text(palette_content, encoding="utf-8")
        logger.info("[%s] 📄 Written: %s", AGENT_NAME, palette_path)

        # 1b. Write data.ts
        scenes_list = []
        script_scenes = script.get("scenes", [])
        timing_scenes = timing.get("scenes", [])
        num_scenes = min(len(script_scenes), len(timing_scenes))
        for i in range(num_scenes):
            s_script = script_scenes[i]
            s_timing = timing_scenes[i]
            
            subtitles = []
            for chunk in s_timing.get("subtitle_chunks", []):
                subtitles.append({
                    "text": chunk.get("text"),
                    "startFrame": chunk.get("start_frame"),
                    "durationFrames": chunk.get("duration_frames")
                })
                
            scene_item = {
                "sceneIndex": i,
                "title": s_script.get("title"),
                "narration": s_script.get("narration"),
                "keyPoints": s_script.get("key_points", []),
                "technicalTerms": s_script.get("technical_terms", []),
                "codeSnippet": s_script.get("code_snippet"),
                "timing": {
                    "startFrame": s_timing.get("start_frame"),
                    "durationFrames": s_timing.get("duration_frames"),
                    "introHoldFrames": s_timing.get("intro_hold_frames"),
                    "outroHoldFrames": s_timing.get("outro_hold_frames"),
                    "subtitleChunks": subtitles
                }
            }
            scenes_list.append(scene_item)

        scenes_json = json.dumps(scenes_list, indent=2)
        data_content = f"""import {{ loadFont }} from "@remotion/google-fonts/Inter";
import {{ loadFont as loadCodeFont }} from "@remotion/google-fonts/FiraCode";

export const FONT = loadFont();
export const CODE_FONT = loadCodeFont();

export const FPS = {VIDEO_FPS};
export const TOTAL_FRAMES = {timing.get("total_frames", VIDEO_DURATION_FRAMES)};

export const SCENES = {scenes_json};
"""
        data_path.parent.mkdir(parents=True, exist_ok=True)
        data_path.write_text(data_content, encoding="utf-8")
        logger.info("[%s] 📄 Written: %s", AGENT_NAME, data_path)

    # 2. Generate each Scene
    scenes = storyboard.get("scenes", [])
    for scene in scenes:
        scene_index = scene.get("scene_index")
        scene_file = GENERATED_DIR / f"scenes/Scene{scene_index}.tsx"
        if not scene_file.exists():
            logger.info("[%s] Generating Scene%d.tsx...", AGENT_NAME, scene_index)
            # Find the timing for this scene (note that storyboard is 1-indexed, timing scenes are 0-indexed)
            scene_timing = {}
            for t_scene in timing.get("scenes", []):
                # Map 1-indexed scene_index to 0-indexed
                if t_scene.get("scene_index") == (scene_index - 1):
                    scene_timing = t_scene
                    break

            pruned_brief = {
                "palette": director_brief.get("palette"),
                "typography": director_brief.get("typography")
            }
            ctx = {
                "director_brief": pruned_brief,
                "scene_storyboard": scene,
                "scene_timing": scene_timing
            }
            user_msg = (
                f"Generate the Scene component for Scene {scene_index} ('{scene.get('visual_concept', '')}').\n"
                "Render the title and subtitle using AnimatedTitle. Render the key points staggered, code blocks if any, "
                "and a highly premium systems diagram utilizing ServerRack and ScalingArrow (or custom SVGs using Tailwind).\n"
                "Align with the visual guidelines and ensure correct imports.\n\n"
                f"Context JSON:\n{json.dumps(ctx, separators=(',', ':'))}"
            )
            raw = chat_completion(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_SCENE},
                    {"role": "user", "content": user_msg}
                ],
                model=GROQ_MODEL,
                temperature=0.35,
                max_tokens=8000,
                agent_name=AGENT_NAME
            )
            files = _parse_files(raw)
            if not files:
                logger.error("[%s] ❌ Failed to parse Scene%d from response! Raw response: %s", AGENT_NAME, scene_index, raw)
                raise ValueError(f"Failed to parse Scene{scene_index} from response.")
            _write_files_to_disk(files)

    # 3. Generate GeneratedVideo.tsx
    video_file = GENERATED_DIR / "GeneratedVideo.tsx"
    logger.info("[%s] Generating GeneratedVideo.tsx programmatically...", AGENT_NAME)
    scenes_list = storyboard.get("scenes", [])
    scenes_list_sorted = sorted(scenes_list, key=lambda s: s.get("scene_index", 0))
    scene_indices = [s.get("scene_index", 0) for s in scenes_list_sorted]

    imports = []
    sequences = []
    for idx in scene_indices:
        imports.append(f"import Scene{idx} from './scenes/Scene{idx}';")
        sequences.append(
            f"      <Sequence from={{SCENES[{idx}].timing.startFrame}} durationInFrames={{SCENES[{idx}].timing.durationFrames}}>\n"
            f"        <Scene{idx} />\n"
            f"      </Sequence>"
        )

    imports_str = "\n".join(imports)
    sequences_str = "\n".join(sequences)

    video_content = f"""// Generated by AI Video Production Pipeline
import React from 'react';
import {{ AbsoluteFill, Sequence }} from 'remotion';
{imports_str}
import {{ SCENES }} from './data';

export const GeneratedVideo: React.FC = () => {{
  return (
    <AbsoluteFill className="bg-slate-950 text-white font-sans overflow-hidden">
{sequences_str}
    </AbsoluteFill>
  );
}};
"""
    video_file.parent.mkdir(parents=True, exist_ok=True)
    video_file.write_text(video_content, encoding="utf-8")
    logger.info("[%s] 📄 Written programmatically: %s", AGENT_NAME, video_file)


    logger.info("[%s] ✅ Completed generation of all files in %s", AGENT_NAME, GENERATED_DIR)
    return "Modular generation completed."


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_files(response: str) -> dict[str, str]:
    """Parse <file path="...">...</file> blocks into a dictionary of {path: content}."""
    pattern = re.compile(r'<file\s+path="([^"]+)">\s*(.*?)\s*</file>', re.DOTALL)
    matches = pattern.findall(response)
    
    parsed = {}
    for path, content in matches:
        content_clean = content.strip()
        if content_clean.startswith("```"):
            lines = content_clean.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content_clean = "\n".join(lines).strip()
        parsed[path] = content_clean
    return parsed


def _write_files_to_disk(files: dict[str, str]) -> None:
    """Write parsed files into GENERATED_DIR, creating all parent directories."""
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    for rel_path, content in files.items():
        safe_path = rel_path.lstrip("./\\")
        out_path = (GENERATED_DIR / safe_path).resolve()

        if not str(out_path).startswith(str(GENERATED_DIR.resolve())):
            logger.warning("[%s] Skipping unsafe path: %s", AGENT_NAME, rel_path)
            continue

        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        logger.info("[%s] 📄 Written: %s", AGENT_NAME, out_path)
