"""Video Plan builder (MASTER_CONTEXT.md §2 stage 7, §6.1). Assembles the final
video_plan.json — the AI<->renderer boundary — by deterministic assembly of what
earlier stages already decided (storyboard scenes/props, reconciled timing,
subtitles). No creative LLM call here; styling comes entirely from config
(design-system defaults), never raw LLM output.
"""

from __future__ import annotations

from pathlib import Path

from app.clients.tracing import span
from app.config import VideoConfig, get_settings
from app.jobs import read_artifact, write_artifact
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.input import JobInput
from app.schemas.scene_timings import SceneTimings
from app.schemas.script import Script
from app.schemas.storyboard import Storyboard
from app.schemas.subtitles import Subtitles
from app.schemas.timings import Timings
from app.schemas.video_plan import AudioRef, PlanScene, VideoMeta, VideoPlan, VideoStyle

_TOLERANCE = 0.5


def _resolve_dimensions(aspect_ratio: str, cfg: VideoConfig) -> tuple[int, int]:
    """Width/height from config, adjusted for a non-default aspectRatio. Keeps the
    config's larger dimension as the "long side" so e.g. 9:16 yields a sensible
    portrait resolution instead of a tiny or distorted one.
    """
    try:
        ratio_w, ratio_h = (float(part) for part in aspect_ratio.split(":"))
    except (ValueError, AttributeError):
        return cfg.width, cfg.height
    if ratio_w >= ratio_h:
        width = cfg.width
        height = round(width * ratio_h / ratio_w)
    else:
        height = cfg.width
        width = round(height * ratio_w / ratio_h)
    return width, height


def run(job_dir: Path) -> None:
    job_input = read_artifact(job_dir, "input", JobInput)
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    script = read_artifact(job_dir, "script", Script)
    storyboard = read_artifact(job_dir, "storyboard", Storyboard)
    scene_timings = read_artifact(job_dir, "scene_timings", SceneTimings)
    subtitles = read_artifact(job_dir, "subtitles", Subtitles)
    timings = read_artifact(job_dir, "timings", Timings)

    with span("video_plan_builder", input=f"{len(storyboard.scenes)} scenes") as obs:
        if abs(scene_timings.totalDurationSec - timings.durationSec) > _TOLERANCE:
            raise ValueError(
                f"video_plan_builder: scene_timings total ({scene_timings.totalDurationSec}) does "
                f"not match voiceover audio duration ({timings.durationSec})"
            )

        video_cfg = get_settings().config.video
        width, height = _resolve_dimensions(job_input.aspectRatio, video_cfg)

        timing_by_scene_id = {st.id: st for st in scene_timings.scenes}
        scenes: list[PlanScene] = []
        for scene in storyboard.scenes:
            timing = timing_by_scene_id.get(scene.id)
            if timing is None:
                raise ValueError(f"video_plan_builder: no reconciled timing found for scene '{scene.id}'")
            scenes.append(
                PlanScene(
                    id=scene.id,
                    concept_id=scene.concept_id,
                    template=scene.template,
                    start=timing.start,
                    duration=timing.duration,
                    animation=scene.animation,
                    props=scene.props,
                )
            )

        plan = VideoPlan(
            video=VideoMeta(
                title=script.title or analysis.topic,
                width=width,
                height=height,
                fps=video_cfg.fps,
                durationSec=scene_timings.totalDurationSec,
                style=VideoStyle(
                    theme=video_cfg.theme,
                    primaryColor=video_cfg.primary_color,
                    backgroundColor=video_cfg.background_color,
                    fontFamily=video_cfg.font_family,
                ),
            ),
            audio=AudioRef(voiceoverFile="voiceover.mp3"),
            subtitles=subtitles.items,
            scenes=scenes,
        )

        write_artifact(job_dir, "video_plan", plan)
        obs.update(output=f"{len(scenes)} scenes, durationSec={plan.video.durationSec}")
