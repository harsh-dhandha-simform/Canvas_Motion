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

    if arc_type == "diagram-driven":
        brief["scene_count"] = max(5, min(7, brief["scene_count"]))

    # Trim all scene arrays to scene_count
    n = brief["scene_count"]
    for key in ("scene_titles", "scene_subtitles", "scene_layouts", "scene_panel_plans"):
        items = brief.get(key, [])
        brief[key] = items[:n]

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
    Merge multi-panel script + storyboard visual data + timing into VideoScript JSON.
    Pure Python merge + Pydantic validation. LLM fallback only if Pydantic fails.
    """
    logger.info("Running assembler node (multi-panel merge)")
    from models.video_script import VideoScript
    from pydantic import ValidationError

    brief   = state["brief"]
    script  = state["script"]
    story   = state.get("story") or {}
    timing  = state["timing"]
    topic   = state["topic"]

    palette = brief.get("palette", {})
    typo    = brief.get("typography", {})

    # Index storyboard and timing by scene_index
    story_by_idx  = {s.get("scene_index", i): s for i, s in enumerate(story.get("scenes", []))}
    timing_by_idx = {s.get("scene_index", i): s for i, s in enumerate(timing.get("scenes", []))}

    script_scenes = script.get("scenes", [])
    scenes_out: list[dict] = []

    for i, s_script in enumerate(script_scenes):
        idx      = s_script.get("scene_index", i)
        s_story  = story_by_idx.get(idx, story_by_idx.get(i, {}))
        s_timing = timing_by_idx.get(idx, timing_by_idx.get(i, {}))

        layout   = s_script.get("layout", "full")
        title    = s_script.get("title", f"Scene {i+1}")
        subtitle = s_script.get("subtitle")

        # Merge visual data into panels by area
        panel_visual_data = s_story.get("panel_visual_data") or {}
        panels_out = []
        for panel in s_script.get("panels", []):
            area   = panel.get("area", "panel")
            ptype  = panel.get("type", "BulletList")
            pdata  = dict(panel.get("data") or {})

            # Merge visual data (nodes/bars/events) from storyboard
            visual = panel_visual_data.get(area) or {}
            pdata.update(visual)

            # Ensure title is always in data
            if "title" not in pdata:
                pdata["title"] = title

            panels_out.append({
                "area": area,
                "type": ptype,
                "data": pdata,
            })

        # Transition: storyboard decides; last scene always "none"
        transition = s_story.get("transition", "fade")
        if i == len(script_scenes) - 1:
            transition = "none"

        scenes_out.append({
            "id":              f"scene-{i + 1}",
            "layout":          layout,
            "title":           title,
            "subtitle":        subtitle,
            "duration_frames": s_timing.get("duration_frames", 210),
            "transition":      transition,
            "panels":          panels_out,
        })

    # Fix frame sum
    total_frames = brief.get("total_seconds", 60) * 30
    actual_total = sum(s["duration_frames"] for s in scenes_out)
    if actual_total != total_frames and scenes_out:
        diff = total_frames - actual_total
        scenes_out[-1]["duration_frames"] = max(120, scenes_out[-1]["duration_frames"] + diff)
        logger.info("[assembler] Frame sum corrected by %d on last scene", diff)

    raw_script = {
        "title":  brief.get("topic", topic),
        "fps":    30,
        "width":  1920,
        "height": 1080,
        "theme": {
            "primary":    palette.get("primary",    "#6366f1"),
            "secondary":  palette.get("secondary",  "#10b981"),
            "accent":     palette.get("accent",     palette.get("highlight", "#f59e0b")),
            "background": palette.get("background", "#030711"),
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
    """Minimal LLM call to fix Pydantic validation errors after merge."""
    from utils.api import chat_completion as _cc
    from models.video_script import VideoScript
    from graph.tools import COMPACT_CATALOG

    errors_summary = str(exc)[:600]

    try:
        raw = _cc(
            messages=[
                {"role": "system", "content": (
                    "Fix this VideoScript JSON to pass Pydantic validation. "
                    "Return ONLY valid JSON, no markdown.\n" + COMPACT_CATALOG
                )},
                {"role": "user", "content": (
                    f"Errors:\n{errors_summary}\n\n"
                    f"JSON:\n{json.dumps(raw_script, indent=2)[:5000]}\n\n"
                    "Return the corrected JSON."
                )},
            ],
            temperature=0.1,
            max_tokens=8192,
            agent_name="AssemblerFix",
        )
        fixed = VideoScript.model_validate(json.loads(extract_json(raw)))
        logger.info("[assembler-fix] ✅ LLM fix passed")
        return {"video_script": fixed.model_dump(mode="json"), "model_used": "llm-fix", "fallback_triggered": True}
    except Exception as e:
        logger.error("[assembler-fix] ❌ LLM fix also failed: %s", e)
        return {"video_script": raw_script, "model_used": "raw", "fallback_triggered": True, "errors": [str(e)]}
