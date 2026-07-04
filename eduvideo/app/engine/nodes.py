"""Deterministic (non-agent) graph nodes, ported from test-remotion
backend/graph/nodes.py. Adapted for eduvideo: checkpoint(slug) → job-artifact
persistence(job_id) via app.engine.persistence; the reference tts_node is replaced
by voiceover_node (SEAM 1, real Deepgram audio timing + keyword-highlight captions).
"""

from __future__ import annotations

import logging
from typing import Any

from app.engine.captions import build_captions
from app.engine.catalog import data_owner
from app.engine.graph_validator import validate_and_repair
from app.engine.models.merge import MergedScene
from app.engine.persistence import cached, persist
from app.engine.state import PipelineState
from app.engine.timing import compute_timings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 3. Merge — combine plan + content + visual + timing + captions (pure Python)
# ---------------------------------------------------------------------------
def merge_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running merge node")
    job_id = state["job_id"]
    if (c := cached(job_id, "merge")) is not None:
        logger.info("[Merge] ⏩ Loaded from artifact")
        return c

    plan = state["plan"]
    script = state.get("script") or {}
    story = state.get("story") or {}

    content_by_idx = {i: s for i, s in enumerate(script.get("scenes", []))}
    visual_by_idx = {i: s for i, s in enumerate(story.get("scenes", []))}

    scenes_out: list[dict] = []
    for i, p_scene in enumerate(plan.get("scenes", [])):
        c_scene = content_by_idx.get(i, {})
        v_scene = visual_by_idx.get(i, {})
        content_panels = c_scene.get("panels", {}) or {}
        visual_panels = v_scene.get("panels", {}) or {}

        panels_out = []
        for panel in p_scene.get("panels", []):
            area = panel.get("area")
            ptype = panel.get("type")
            size_ratio = panel.get("size_ratio", 1)
            delay_frames = panel.get("delay_frames", 0)
            if data_owner(ptype) == "visual":
                raw_data = dict(visual_panels.get(area) or {})
                owner = "visual_architect"
            else:
                raw_data = dict(content_panels.get(area) or {})
                owner = "scriptwriter"

            # Safety net: LLMs sometimes wrap the payload in {"component": "...", "data": {...}}
            # instead of putting the schema properties directly at the top level.
            data = raw_data.get("data") if "data" in raw_data and isinstance(raw_data["data"], dict) else raw_data

            if not data or data == {}:
                logger.warning(
                    "[Merge] ⚠️  Scene %d area='%s' type='%s' — %s returned EMPTY data! "
                    "This panel will be blank in the final video.",
                    i, area, ptype, owner,
                )

            data.setdefault("title", p_scene.get("title", ""))
            panels_out.append(
                {"area": area, "type": ptype, "size_ratio": size_ratio, "delay_frames": delay_frames, "data": data}
            )

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

    # Deterministic (estimate) timing (needs narration) → then captions (needs frame
    # positions). voiceover_node later overrides these with REAL Deepgram audio timing.
    fps = state.get("fps", 30)
    compute_timings(scenes_out, state.get("duration_seconds", 60), fps=fps)
    captions = build_captions(scenes_out, fps=fps)

    validated_scenes = [MergedScene.model_validate(s).model_dump() for s in scenes_out]

    data = {"scenes": validated_scenes, "captions": captions}
    persist(job_id, "merge", data)
    return data


# ---------------------------------------------------------------------------
# 4. Validator — panel JSON-Schema repair + coverage check
# ---------------------------------------------------------------------------
def validator_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running validator node")
    job_id = state["job_id"]
    if (c := cached(job_id, "validation")) is not None:
        logger.info("[Validator] ⏩ Loaded from artifact")
        return c

    scenes = state["scenes"]
    report = validate_and_repair(scenes, state["syllabus"])

    data = {"scenes": scenes, "validation_report": report}
    persist(job_id, "validation", data)
    return data


# ---------------------------------------------------------------------------
# 5. Assembler — VideoScript envelope + Pydantic validation
# ---------------------------------------------------------------------------
def assembler_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running assembler node")
    job_id = state["job_id"]
    if (c := cached(job_id, "video_script")) is not None:
        logger.info("[Assembler] ⏩ Loaded from artifact")
        return {"video_script": c}

    from pydantic import ValidationError

    from app.engine.models.video_script import VideoScript

    plan = state["plan"]
    syllabus = state["syllabus"]
    theme = plan.get("theme", {})
    fps = state.get("fps", 30)

    scenes = state["scenes"]

    # Persist scenes_timed.json (covers + per-scene seconds) BEFORE stripping covers —
    # the learning-module concept_spine tail stage derives the concept windows from it.
    # (syllabus.json is already on disk from researcher_node; do NOT re-persist it.)
    if cached(job_id, "scenes_timed") is None:
        persist(job_id, "scenes_timed", {
            "scenes": [
                {
                    "id": s["id"],
                    "covers": s.get("covers", []),
                    "start": round(s.get("start_frame", 0) / fps, 3),
                    "duration": round(s.get("duration_frames", 0) / fps, 3),
                }
                for s in scenes
            ]
        })

    # Strip planning-only field before validation
    clean_scenes = [{k: v for k, v in s.items() if k != "covers"} for s in scenes]

    raw_script = {
        "title": syllabus.get("topic", state["topic"]),
        "fps": fps,
        "width": state.get("width", 1920),
        "height": state.get("height", 1080),
        "theme": {
            "primary": theme.get("primary", "#7aa2f7"),
            "secondary": theme.get("secondary", "#e0af68"),
            "accent": theme.get("accent", "#bb9af7"),
            "background": theme.get("background", "#1a1b26"),
            "font": theme.get("font", "Inter"),
        },
        "voiceover": {
            "provider": "deepgram" if state.get("audio_path") else None,
            "captions": state.get("captions") or [],
        },
        "audio_url": state.get("audio_url"),
        "scenes": clean_scenes,
    }

    try:
        vs = VideoScript.model_validate(raw_script)
        validated = vs.model_dump(mode="json")
        logger.info("[assembler] ✅ %d scenes, %d frames", len(vs.scenes), vs.total_frames())
        persist(job_id, "video_script", validated)
        return {"video_script": validated, "model_used": "merge", "fallback_triggered": False}
    except ValidationError as exc:
        logger.error("[assembler] ❌ Pydantic failed: %s", exc)
        persist(job_id, "video_script", raw_script)
        return {
            "video_script": raw_script,
            "model_used": "raw",
            "fallback_triggered": True,
            "errors": [str(exc)[:500]],
        }
