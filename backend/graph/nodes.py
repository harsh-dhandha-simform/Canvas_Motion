"""
backend/graph/nodes.py — LangGraph Nodes

Wraps the agent logic into distinct, state-aware execution steps.
"""

import json
import logging
import time
from typing import Dict, Any

from config import (
    FRONTEND_ROOT,
    INTER_AGENT_DELAY_SECONDS,
    ROOT_TSX_PATH,
    VIDEO_DURATION_FRAMES,
    VIDEO_FPS,
    VIDEO_HEIGHT,
    VIDEO_WIDTH,
)
from agents import director, scriptwriter, audio_designer, storyboard, sync, code_generator
from graph.state import PipelineState

logger = logging.getLogger("pipeline.nodes")

# ---------------------------------------------------------------------------
# Root.tsx patcher and context saver
# ---------------------------------------------------------------------------

ROOT_TSX_TEMPLATE = """\
import "./index.css";
import {{ Composition }} from "remotion";
import {{ GeneratedVideo }} from "./generated/GeneratedVideo";

export const RemotionRoot: React.FC = () => {{
  return (
    <>
      <Composition
        id="GeneratedVideo"
        component={{GeneratedVideo}}
        durationInFrames={{{duration_frames}}}
        fps={{{fps}}}
        width={{{width}}}
        height={{{height}}}
      />
    </>
  );
}};
"""


def patch_root_tsx(total_frames: int) -> None:
    """
    Overwrite Root.tsx to register only the GeneratedVideo composition.
    Keeps the duration aligned with the Sync agent's output.
    """
    content = ROOT_TSX_TEMPLATE.format(
        duration_frames=total_frames,
        fps=VIDEO_FPS,
        width=VIDEO_WIDTH,
        height=VIDEO_HEIGHT,
    )
    ROOT_TSX_PATH.write_text(content, encoding="utf-8")
    logger.info("🔧 Patched Root.tsx → durationInFrames=%d", total_frames)


def save_context(
    topic: str,
    brief: dict,
    script: dict,
    audio_design: dict,
    story: dict,
    timing: dict,
) -> None:
    """Persist the full pipeline context JSON for debugging."""
    ctx = {
        "topic": topic,
        "director_brief": brief,
        "script": script,
        "audio_design": audio_design,
        "storyboard": story,
        "timing": timing,
    }
    out_dir = FRONTEND_ROOT.parent / "backend" / "debug"
    out_dir.mkdir(parents=True, exist_ok=True)

    safe_topic = topic.lower().replace(" ", "_")[:40]
    out_path = out_dir / f"context_{safe_topic}.json"
    out_path.write_text(json.dumps(ctx, indent=2), encoding="utf-8")
    logger.info("💾 Pipeline context saved to %s", out_path)


# ---------------------------------------------------------------------------
# Rate limit pacing helper
# ---------------------------------------------------------------------------

def _pace() -> None:
    """Sleep between agents to respect Groq RPM limits."""
    logger.info("   ⏳ Rate-limit pause (%.1fs) …", INTER_AGENT_DELAY_SECONDS)
    time.sleep(INTER_AGENT_DELAY_SECONDS)


# ---------------------------------------------------------------------------
# Node definitions
# ---------------------------------------------------------------------------

def director_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 1/6: Director ──────────────────────")
    logger.info("   Planning tone, palette & scene structure")
    brief = director.run_agent(state["topic"])
    _pace()
    return {"director_brief": brief}


def scriptwriter_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 2/6: Scriptwriter ─────────────────────")
    logger.info("   Writing narration & key points")
    script = scriptwriter.run_agent(state["director_brief"])
    _pace()
    return {"script": script}


def storyboard_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 3/5: Storyboard ───────────────────────")
    logger.info("   Designing scene layouts & SVG elements")
    story = storyboard.run_agent(state["director_brief"], state["script"])
    _pace()
    return {"storyboard": story}


def sync_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 4/5: SyncSpecialist ──────────────────")
    logger.info("   Computing frame-accurate timings")
    timing = sync.run_agent(state["director_brief"], state["script"])
    _pace()
    return {"timing": timing}


def code_generator_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 5/5: CodeGenerator ───────────────────")
    logger.info("   Writing GeneratedVideo.tsx")
    tsx_code = code_generator.run_agent(
        state["director_brief"],
        state["script"],
        {},
        state["storyboard"],
        state["timing"],
    )
    return {"tsx_code": tsx_code}


def post_process_node(state: PipelineState) -> Dict[str, Any]:
    logger.info("")
    logger.info("── Step 6/5: Post-Processing ────────────────")
    logger.info("   Patching Root.tsx & saving context")

    timing = state["timing"]
    total_frames = timing.get("total_frames", VIDEO_DURATION_FRAMES)
    patch_root_tsx(total_frames)

    save_context(
        state["topic"],
        state["director_brief"],
        state["script"],
        {},
        state["storyboard"],
        state["timing"],
    )
    return {}
