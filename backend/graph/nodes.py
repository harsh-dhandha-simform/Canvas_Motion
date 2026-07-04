import logging
from typing import Any

from graph.state import PipelineState
from component_catalog import data_owner
from utils.timing import compute_timings
from graph.validator import validate_and_repair
from schemas.merge import MergedScene
from utils.checkpoint import load_checkpoint, save_checkpoint
from utils.captions import build_captions

logger = logging.getLogger(__name__)



# ---------------------------------------------------------------------------
# 3. Merge — combine plan + content + visual + timing + captions (pure Python)
# ---------------------------------------------------------------------------
def merge_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running merge node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "scenes")) is not None:
        logger.info("[Merge] ⏩ Loaded from checkpoint")
        return cached

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
            # The agents now normalize this themselves, but we keep it here as a fallback.
            data = raw_data.get("data") if "data" in raw_data and isinstance(raw_data["data"], dict) else raw_data
            
            # Warn if we got empty data for a panel that should have been filled
            if not data or data == {}:
                logger.warning(
                    "[Merge] ⚠️  Scene %d area='%s' type='%s' — %s returned EMPTY data! "
                    "This panel will be blank in the final video.",
                    i, area, ptype, owner
                )
            
            data.setdefault("title", p_scene.get("title", ""))
            panels_out.append({"area": area, "type": ptype, "size_ratio": size_ratio, "delay_frames": delay_frames, "data": data})


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
    fps = state.get("fps", 30)
    compute_timings(scenes_out, state.get("duration_seconds", 60), fps=fps)
    captions = build_captions(scenes_out, fps=fps)

    # Validate all merged scenes before returning them
    validated_scenes = [MergedScene.model_validate(s).model_dump() for s in scenes_out]

    data = {"scenes": validated_scenes, "captions": captions}
    save_checkpoint(slug, "scenes", data)
    return data


# ---------------------------------------------------------------------------
# 4. Validator — schema repair + coverage check
# ---------------------------------------------------------------------------
def validator_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running validator node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "validation_report")) is not None:
        logger.info("[Validator] ⏩ Loaded from checkpoint")
        return cached

    scenes = state["scenes"]
    report = validate_and_repair(scenes, state["syllabus"])
    
    data = {"scenes": scenes, "validation_report": report}
    save_checkpoint(slug, "validation_report", data)
    return data


# ---------------------------------------------------------------------------
# 4.5 TTS — Generate audio and update captions with perfect timestamps
# ---------------------------------------------------------------------------
def tts_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running TTS node")
    slug = state["checkpoint_slug"]
    
    # We don't cache this strictly because the user might have enabled/disabled audio.
    # If audio is requested and already generated for this slug, we check if file exists.
    if (cached := load_checkpoint(slug, "tts")) is not None:
        logger.info("[TTS] ⏩ Loaded from checkpoint")
        return cached

    from utils.tts import generate_audio_and_timestamps
    from utils.captions import build_captions_from_words
    
    # Concatenate all narration
    scenes = state["scenes"]
    full_narration = " ".join(s.get("narration", "").strip() for s in scenes)
    
    audio_path, words = generate_audio_and_timestamps(full_narration, slug)
    
    if not audio_path or not words:
        logger.warning("[TTS] Failed to generate audio or timestamps.")
        return {}
        
    # Rebuild captions using perfect word timestamps
    perfect_captions = build_captions_from_words(words)
    
    data = {
        "audio_path": audio_path, 
        "audio_url": f"/audio/{slug}.mp3", 
        "captions": perfect_captions
    }
    save_checkpoint(slug, "tts", data)
    return data


# ---------------------------------------------------------------------------
# 5. Assembler — VideoScript envelope + Pydantic validation
# ---------------------------------------------------------------------------
def assembler_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running assembler node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "video_script")) is not None:
        logger.info("[Assembler] ⏩ Loaded from checkpoint")
        return {"video_script": cached}

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
        "fps": state.get("fps", 30),
        "width": state.get("width", 1920),
        "height": state.get("height", 1080),
        "theme": {
            "primary": theme.get("primary", "#6366f1"),
            "secondary": theme.get("secondary", "#10b981"),
            "accent": theme.get("accent", "#f59e0b"),
            "background": theme.get("background", "#030711"),
            "font": theme.get("font", "Inter"),
        },
        "voiceover": {
            "provider": "deepgram" if state.get("audio_path") else None, 
            "captions": state.get("captions") or []
        },
        "audio_url": state.get("audio_url"),
        "scenes": clean_scenes,
    }

    try:
        vs = VideoScript.model_validate(raw_script)
        validated = vs.model_dump(mode="json")
        logger.info("[assembler] ✅ %d scenes, %d frames", len(vs.scenes), vs.total_frames())
        save_checkpoint(slug, "video_script", validated)
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
