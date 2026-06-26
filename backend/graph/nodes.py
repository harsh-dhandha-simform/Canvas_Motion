import logging
from typing import Any

from graph.state import PipelineState
from agents import researcher, director, scriptwriter, visual_architect
from component_catalog import data_owner
from utils.timing import compute_timings
from utils.captions import build_captions
from graph.validator import validate_and_repair

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 0. Researcher — topic → teaching syllabus (subtopics, prereqs, depth)
# ---------------------------------------------------------------------------
def researcher_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running researcher node")
    syllabus = researcher.run_agent(state["topic"], state.get("duration_seconds", 60))
    return {"syllabus": syllabus}


# ---------------------------------------------------------------------------
# 1. Director — syllabus → scene blueprint (picks from shortlists)
# ---------------------------------------------------------------------------
def director_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running director node")
    plan = director.run_agent(state["syllabus"], state.get("duration_seconds", 60))
    return {"plan": plan}


# ---------------------------------------------------------------------------
# 2a / 2b — parallel fan-out: content + visual data (disjoint panels)
# ---------------------------------------------------------------------------
def scriptwriter_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running scriptwriter node")
    script = scriptwriter.run_agent(state["plan"], state["syllabus"])
    return {"script": script}


def visual_architect_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running visual architect node")
    story = visual_architect.run_agent(state["plan"], state["syllabus"])
    return {"story": story}


# ---------------------------------------------------------------------------
# 3. Merge — combine plan + content + visual + timing + captions (pure Python)
# ---------------------------------------------------------------------------
def merge_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running merge node")
    plan = state["plan"]
    script = state.get("script") or {}
    story = state.get("story") or {}

    content_by_idx = {s.get("index", i): s for i, s in enumerate(script.get("scenes", []))}
    visual_by_idx = {s.get("index", i): s for i, s in enumerate(story.get("scenes", []))}

    scenes_out: list[dict] = []
    for i, p_scene in enumerate(plan.get("scenes", [])):
        idx = p_scene.get("index", i)
        c_scene = content_by_idx.get(idx, {})
        v_scene = visual_by_idx.get(idx, {})
        content_panels = c_scene.get("panels", {}) or {}
        visual_panels = v_scene.get("panels", {}) or {}

        panels_out = []
        for panel in p_scene.get("panels", []):
            area = panel.get("area")
            ptype = panel.get("type")
            if data_owner(ptype) == "visual":
                data = dict(visual_panels.get(area) or {})
            else:
                data = dict(content_panels.get(area) or {})
            data.setdefault("title", p_scene.get("title", ""))
            panels_out.append({"area": area, "type": ptype, "data": data})

        transition = v_scene.get("transition", "fade")
        if i == len(plan.get("scenes", [])) - 1:
            transition = "none"

        scenes_out.append({
            "id": f"scene-{i + 1}",
            "layout": p_scene.get("layout", "full"),
            "title": p_scene.get("title", f"Scene {i + 1}"),
            "subtitle": p_scene.get("subtitle"),
            "transition": transition,
            "narration": c_scene.get("narration", ""),
            "covers": p_scene.get("covers", []),
            "panels": panels_out,
        })

    # Deterministic timing (needs narration) → then captions (needs frame positions).
    compute_timings(scenes_out, state.get("duration_seconds", 60))
    captions = build_captions(scenes_out)

    return {"scenes": scenes_out, "captions": captions}


# ---------------------------------------------------------------------------
# 4. Validator — schema repair + coverage check
# ---------------------------------------------------------------------------
def validator_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running validator node")
    scenes = state["scenes"]
    report = validate_and_repair(scenes, state["syllabus"])
    return {"scenes": scenes, "validation_report": report}


# ---------------------------------------------------------------------------
# 5. Assembler — VideoScript envelope + Pydantic validation
# ---------------------------------------------------------------------------
def assembler_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running assembler node")
    from models.video_script import VideoScript
    from pydantic import ValidationError

    plan = state["plan"]
    syllabus = state["syllabus"]
    theme = plan.get("theme", {})

    scenes = state["scenes"]
    # Strip planning-only field before validation
    clean_scenes = [{k: v for k, v in s.items() if k != "covers"} for s in scenes]

    raw_script = {
        "title": syllabus.get("topic", state["topic"]),
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "theme": {
            "primary": theme.get("primary", "#6366f1"),
            "secondary": theme.get("secondary", "#10b981"),
            "accent": theme.get("accent", "#f59e0b"),
            "background": theme.get("background", "#030711"),
            "font": theme.get("font", "Inter"),
        },
        "voiceover": {"provider": None, "captions": state.get("captions") or []},
        "scenes": clean_scenes,
    }

    try:
        vs = VideoScript.model_validate(raw_script)
        validated = vs.model_dump(mode="json")
        logger.info("[assembler] ✅ %d scenes, %d frames", len(vs.scenes), vs.total_frames())
        return {"video_script": validated, "model_used": "merge", "fallback_triggered": False}
    except ValidationError as exc:
        logger.error("[assembler] ❌ Pydantic failed: %s", exc)
        # Envelope-level failure is rare now (Validator already fixed panels); surface raw.
        return {
            "video_script": raw_script,
            "model_used": "raw",
            "fallback_triggered": True,
            "errors": [str(exc)[:500]],
        }
