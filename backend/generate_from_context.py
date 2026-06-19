import json
import sys
from pathlib import Path

# Bootstrap: ensure repo root is on sys.path
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.config import GENERATED_DIR, VIDEO_FPS
from backend.agents import code_generator
from backend.graph.nodes import patch_root_tsx

def main():
    context_path = Path(__file__).resolve().parent / "debug" / "context_consistent_hashing.json"
    if not context_path.exists():
        print(f"Error: Context file not found at {context_path}")
        return

    print(f"Loading context from {context_path}...")
    with open(context_path, "r", encoding="utf-8") as f:
        ctx = json.load(f)

    director_brief = ctx["director_brief"]
    script = ctx["script"]
    storyboard = ctx["storyboard"]
    timing = ctx["timing"]

    scenes = storyboard.get("scenes", [])
    print(f"Loaded {len(scenes)} scenes from storyboard.")

    # Create the GENERATED_DIR and scenes directory
    scenes_dir = GENERATED_DIR / "scenes"
    scenes_dir.mkdir(parents=True, exist_ok=True)

    # 1. Write stub components for Scene3 to Scene9 to bypass LLM generation via disk cache
    print("Writing stubs for Scene3 to Scene9...")
    for scene in scenes:
        idx = scene.get("scene_index")
        if idx >= 3:
            scene_file = scenes_dir / f"Scene{idx}.tsx"
            # Get title and narration for this scene
            scene_title = ""
            for s_item in script.get("scenes", []):
                if s_item.get("scene_index") == idx:
                    scene_title = s_item.get("title", "")
                    scene_narration = s_item.get("narration", "")
                    break
            
            stub_content = f"""import React from 'react';
import {{ AnimatedTitle }} from "../../components/AnimatedTitle";
import {{ PALETTE }} from "../components/Palette";

const Scene{idx}: React.FC = () => {{
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-8">
      <AnimatedTitle
        title="Scene {idx}: {scene_title}"
        subtitle="Visual placeholder"
        accentColor={{PALETTE.primary}}
        align="center"
      />
      <p className="text-slate-400 mt-6 text-center max-w-3xl text-lg font-sans">
        {scene_narration}
      </p>
    </div>
  );
}};

export default Scene{idx};
"""
            scene_file.write_text(stub_content, encoding="utf-8")
            print(f"  Written stub: {scene_file.name}")

    # 2. Run the CodeGenerator agent. Since Scene3-Scene9 exist, it will only generate Scene0, Scene1, Scene2 with LLM.
    print("Running CodeGenerator agent for Scene0, Scene1, and Scene2...")
    code_generator.run_agent(
        director_brief,
        script,
        {},
        storyboard,
        timing
    )

    # 3. Patch Root.tsx
    total_frames = timing.get("total_frames", 3600)
    print(f"Patching Root.tsx with total duration: {total_frames} frames...")
    patch_root_tsx(total_frames)

    print("Success! Initial scenes (0-2) generated and placeholders written for remaining scenes.")

if __name__ == "__main__":
    main()
