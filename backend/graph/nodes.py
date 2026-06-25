import json
import logging
from typing import Any
from graph.state import PipelineState
from agents import director, scriptwriter, storyboard, sync
from utils.api import extract_json
from utils.topic_classifier import detect_arc_type

logger = logging.getLogger(__name__)


def director_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running director node")
    brief = director.run_agent(state["topic"])

    # Override total_seconds with the caller's explicit duration
    duration_seconds = state.get("duration_seconds", 60)
    brief["total_seconds"] = duration_seconds

    # Override arc_type with our deterministic classifier
    arc_type = detect_arc_type(state["topic"])
    brief["arc_type"] = arc_type

    # Derive scene_count from duration: ~1 scene per 10s, clamped 4-12
    brief["scene_count"] = max(4, min(12, duration_seconds // 10))

    # For diagram-driven topics, clamp scene_count to 5-7
    if arc_type == "diagram-driven":
        brief["scene_count"] = max(5, min(7, brief["scene_count"]))

    # Trim scene_titles and scene_types to match scene_count
    for key in ("scene_titles", "scene_types"):
        items = brief.get(key, [])
        if len(items) > brief["scene_count"]:
            brief[key] = items[:brief["scene_count"]]

    logger.info(
        "[director_node] arc_type=%s scene_count=%d total_seconds=%d",
        arc_type, brief.get("scene_count"), brief.get("total_seconds"),
    )
    return {"brief": brief}


def scriptwriter_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running scriptwriter node")
    script = scriptwriter.run_agent(state["brief"])
    return {"script": script}


def storyboard_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running storyboard node")
    story = storyboard.run_agent(state["brief"], state["script"])
    return {"story": story}


def sync_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running sync node")
    timing = sync.run_agent(state["brief"], state["script"])
    return {"timing": timing}


def assembler_node(state: PipelineState) -> dict[str, Any]:
    """
    Merge Scriptwriter + Storyboard + Sync outputs into VideoScript JSON.
    Pure Python merge + Pydantic validation. No heavy LLM call.
    LLM fallback only if Pydantic validation fails.
    """
    logger.info("Running assembler node (merge mode)")
    from models.video_script import VideoScript
    from pydantic import ValidationError

    brief   = state["brief"]
    script  = state["script"]
    story   = state.get("story") or {}
    timing  = state["timing"]
    topic   = state["topic"]

    palette = brief.get("palette", {})
    typo    = brief.get("typography", {})

    # Index storyboard and timing by scene_index for O(1) lookup
    story_by_idx  = {s.get("scene_index", i): s for i, s in enumerate(story.get("scenes", []))}
    timing_by_idx = {s.get("scene_index", i): s for i, s in enumerate(timing.get("scenes", []))}

    script_scenes = script.get("scenes", [])
    scenes_out: list[dict] = []

    for i, s_script in enumerate(script_scenes):
        idx       = s_script.get("scene_index", i)
        s_story   = story_by_idx.get(idx, story_by_idx.get(i, {}))
        s_timing  = timing_by_idx.get(idx, timing_by_idx.get(i, {}))

        component_type = s_script.get("component_type", "BulletList")

        # Merge: Scriptwriter text fields + Storyboard visual fields
        text_data   = dict(s_script.get("data") or {})
        visual_data = dict(s_story.get("visual_data") or {})
        merged_data = {**text_data, **visual_data}

        # Ensure title always present
        if "title" not in merged_data:
            merged_data["title"] = s_script.get("title", f"Scene {i + 1}")

        # Transition: storyboard decides; last scene always "none"
        transition = s_story.get("transition", "fade")
        if i == len(script_scenes) - 1:
            transition = "none"

        scenes_out.append({
            "id": f"scene-{i + 1}",
            "type": component_type,
            "duration_frames": s_timing.get("duration_frames", 150),
            "transition": transition,
            "data": merged_data,
        })

    # Fix frame sum (last-resort correction)
    total_frames = brief.get("total_seconds", 60) * 30
    actual_total = sum(s["duration_frames"] for s in scenes_out)
    if actual_total != total_frames and scenes_out:
        diff = total_frames - actual_total
        scenes_out[-1]["duration_frames"] = max(90, scenes_out[-1]["duration_frames"] + diff)
        logger.info("[assembler] Frame sum corrected by %d frames on last scene", diff)

    raw_script = {
        "title":  brief.get("topic", topic),
        "fps":    30,
        "width":  1920,
        "height": 1080,
        "theme": {
            "primary":    palette.get("primary",    "#7c3aed"),
            "secondary":  palette.get("secondary",  "#f59e0b"),
            "accent":     palette.get("highlight",  palette.get("accent", "#34d399")),
            "background": palette.get("background", "#0b0f1e"),
            "font":       typo.get("heading_font",  "Inter"),
        },
        "scenes": scenes_out,
    }

    try:
        vs        = VideoScript.model_validate(raw_script)
        validated = vs.model_dump(mode="json")
        logger.info(
            "[assembler] ✅ Merge OK — %d scenes, %d frames",
            len(vs.scenes), vs.total_frames(),
        )
        return {"video_script": validated, "model_used": "merge", "fallback_triggered": False}
    except ValidationError as exc:
        logger.warning("[assembler] ⚠️ Pydantic failed (%d errors) — LLM fix pass", len(exc.errors()))
        return _assembler_llm_fix(raw_script, exc, topic)
    except Exception as exc:
        logger.error("[assembler] ❌ Unexpected error: %s", exc)
        return {"errors": [str(exc)]}


def _assembler_llm_fix(raw_script: dict, exc: Exception, topic: str) -> dict[str, Any]:
    """Minimal LLM call to patch a structurally-broken script after merge."""
    from utils.api import chat_completion as _cc
    from models.video_script import VideoScript
    from pydantic import ValidationError
    from graph.tools import COMPACT_CATALOG

    errors_summary = str(exc)[:800]

    fix_prompt = (
        f"Fix this VideoScript JSON so it passes Pydantic validation.\n"
        f"Errors:\n{errors_summary}\n\n"
        f"Current JSON:\n{json.dumps(raw_script, indent=2)[:4000]}\n\n"
        "Return ONLY the corrected JSON object. No markdown, no prose."
    )
    system = (
        f"You fix broken VideoScript JSON. {COMPACT_CATALOG}\n"
        "Return ONLY valid JSON matching the VideoScript schema."
    )

    try:
        raw = _cc(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": fix_prompt},
            ],
            temperature=0.1,
            max_tokens=8192,
            agent_name="AssemblerFix",
        )
        fixed = VideoScript.model_validate(json.loads(extract_json(raw)))
        logger.info("[assembler-fix] ✅ LLM fix passed")
        return {
            "video_script": fixed.model_dump(mode="json"),
            "model_used": "llm-fix",
            "fallback_triggered": True,
        }
    except Exception as e:
        logger.error("[assembler-fix] ❌ LLM fix also failed: %s", e)
        return {
            "video_script": raw_script,
            "model_used": "raw",
            "fallback_triggered": True,
            "errors": [str(e)],
        }
