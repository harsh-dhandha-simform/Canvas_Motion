"""Deterministic (non-agent) graph nodes, ported from test-remotion
backend/graph/nodes.py. Adapted for eduvideo: checkpoint(slug) → job-artifact
persistence(job_id) via app.engine.persistence; the reference tts_node is replaced
by voiceover_node (SEAM 1, real Deepgram audio timing + keyword-highlight captions).
"""

from __future__ import annotations

import logging
from typing import Any

from app.clients.tts import TTSClient
from app.clients.voice_rotation import next_voice_model
from app.config import get_settings
from app.engine._subtitle_util import chunk_segment_text, chunk_text, find_highlights
from app.engine.captions import build_captions
from app.engine.catalog import data_owner
from app.engine.graph_validator import validate_and_repair
from app.engine.models.merge import MergedScene
from app.engine.persistence import cached, persist
from app.engine.state import PipelineState
from app.engine.timing import compute_timings
from app.jobs import job_dir_for

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
# 4.5 Voiceover — REAL Deepgram audio (voice-rotation) drives scene durations +
#     keyword-highlight captions (SEAM 1). Replaces the reference tts_node.
# ---------------------------------------------------------------------------
def _caption_lines(scene_words: list[dict], base_sec: float, first_word_sec: float,
                   key_terms: list[str], max_words: int, max_chars: int) -> list[dict]:
    """Group a scene's STT words into caption lines, timed on the (gapless) video
    timeline: base_sec is the scene's start on that timeline, first_word_sec is the
    scene's first STT word start (so per-word offsets rebase onto base_sec)."""
    lines: list[dict] = []
    cur: list[dict] = []

    def flush() -> None:
        if not cur:
            return
        text = " ".join(w.get("punctuated_word") or w["word"] for w in cur)
        start = base_sec + (cur[0]["start"] - first_word_sec)
        end = base_sec + (cur[-1]["end"] - first_word_sec)
        lines.append({
            "text": text,
            "startMs": max(0, round(start * 1000)),
            "endMs": max(0, round(end * 1000)),
            "timestampMs": max(0, round(start * 1000)),
            "confidence": None,
            "highlight": find_highlights(text, key_terms),
        })

    for w in scene_words:
        candidate = cur + [w]
        cand_text = " ".join(x.get("punctuated_word") or x["word"] for x in candidate)
        if cur and (len(candidate) > max_words or len(cand_text) > max_chars):
            flush()
            cur = [w]
        else:
            cur = candidate
    flush()
    return lines


def voiceover_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running voiceover node")
    job_id = state["job_id"]
    if (c := cached(job_id, "voiceover")) is not None and (job_dir_for(job_id) / "voiceover.mp3").exists():
        logger.info("[Voiceover] ⏩ Loaded from artifact")
        return c

    if not state.get("enable_audio"):
        logger.info("[Voiceover] audio disabled — keeping estimate timing/captions")
        return {}

    scenes = state["scenes"]
    fps = state.get("fps", 30)
    key_terms = (state.get("syllabus") or {}).get("key_terms", []) or []
    cfg = get_settings().config.subtitles
    min_scene_frames = max(1, round(1.0 * fps))

    # Synthesize the full narration with ONE rotated voice for the whole job.
    tts = TTSClient()
    voice = next_voice_model()
    narr = [(s.get("narration") or "").strip() for s in scenes]
    full = " ".join(n for n in narr if n)
    if not full.strip():
        logger.warning("[Voiceover] no narration — skipping audio")
        return {}
    try:
        audio = b"".join(tts.synthesize(ch, model=voice)[0] for ch in chunk_text(full, 1800))
    except Exception as exc:  # never block the render
        logger.warning("[Voiceover] TTS failed (%s) — keeping estimate timing", exc)
        return {}

    job_dir = job_dir_for(job_id)
    (job_dir / "voiceover.mp3").write_bytes(audio)

    words = tts.transcribe(audio)
    if not words:
        logger.warning("[Voiceover] STT returned no words — keeping estimate timing (audio still attached)")
        # audio exists but no real timing: keep merge estimates, just attach the track.
        data = {"audio_path": str(job_dir / "voiceover.mp3"), "audio_url": "voiceover.mp3"}
        persist(job_id, "voiceover", data)
        return data

    # Assign words to scenes in order, derive REAL per-scene durations, rebuild
    # gapless start_frame, and build keyword-highlight captions on that timeline.
    counts = [len(n.split()) for n in narr]
    idx = 0
    cursor = 0  # frames
    captions: list[dict] = []
    for si, s in enumerate(scenes):
        n = counts[si]
        s["start_frame"] = cursor
        if n == 0:
            # blank-narration scene (e.g. title/outro): keep its estimate duration, no captions
            cursor += s.get("duration_frames", min_scene_frames)
            continue
        sw = words[idx : idx + n]
        idx += n
        if not sw:  # ran out of STT words (drift) — keep estimate duration
            cursor += s.get("duration_frames", min_scene_frames)
            continue
        span_sec = max(0.0, sw[-1]["end"] - sw[0]["start"])
        s["duration_frames"] = max(min_scene_frames, round(span_sec * fps))
        captions.extend(
            _caption_lines(sw, cursor / fps, sw[0]["start"], key_terms,
                           cfg.max_words_per_line, cfg.max_chars_per_line)
        )
        cursor += s["duration_frames"]

    data = {
        "audio_path": str(job_dir / "voiceover.mp3"),
        "audio_url": "voiceover.mp3",
        "captions": captions,
        "scenes": scenes,
    }
    persist(job_id, "voiceover", data)
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
