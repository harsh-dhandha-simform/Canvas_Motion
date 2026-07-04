"""Remotion adapter (used when config.render.engine == "remotion"). The ONLY
module aware of the Remotion project's component names/props — mirrors how
adapter.py is the only module aware of Revideo. Maps our video_plan.json
(template + props contract, unchanged) onto the Remotion project's
VideoScriptProps JSON shape and invokes `npx remotion render`.

Kept entirely separate from adapter.py's Revideo path so that path stays intact
and switchable back via config while this one is verified in production.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

from app.schemas.video_plan import PlanScene, VideoPlan

_TRANSITION_MAP = {
    "fadeIn": "fade",
    "slideUp": "slideUp",
    "popIn": "zoom",
    "none": "none",
}

# Our VideoStyle only carries one accent (primaryColor) — these two fill out the
# Remotion theme's secondary/accent slots, matching the dark_matte palette already
# established for the Revideo renderer (renderer/src/styles/designSystem.ts).
_SECONDARY_ACCENT = "#e0af68"
_TERTIARY_ACCENT = "#bb9af7"


def _map_scene(scene: PlanScene, fps: int) -> dict[str, Any]:
    """Maps one of our 10 templates onto the closest Remotion component. v1:
    correctness and always-renders over per-diagram-type fidelity — DiagramScene
    always becomes FlowDiagram (the one diagram component with no required
    layout/type-specific fields), regardless of its diagramType. Teaching the
    agents to pick from the full ~33-component library richly is follow-up work.
    """
    template = scene.template.value
    props = scene.props
    duration_frames = max(1, round(scene.duration * fps))
    transition = _TRANSITION_MAP.get(scene.animation.value, "none")

    if template == "TitleScene":
        rtype, data = "AnimatedTitle", {"title": props["title"], "subtitle": props.get("subtitle")}
    elif template == "DefinitionScene":
        rtype, data = "CalloutAnnotation", {
            "title": props["term"],
            "body": props["definition"],
            "bullets": props.get("keywords", []),
        }
    elif template == "BulletListScene":
        rtype, data = "BulletList", {"title": props["heading"], "items": props["items"]}
    elif template == "DiagramScene":
        rtype, data = "FlowDiagram", {
            "title": props.get("caption") or "",
            "nodes": [{"id": n["id"], "label": n["label"], "kind": "process"} for n in props["nodes"]],
            "edges": [
                {"fromId": e["from"], "toId": e["to"], "label": e.get("label")} for e in props["edges"]
            ],
        }
    elif template == "CodeScene":
        rtype, data = "CodeBlock", {
            "title": props.get("caption"),
            "code": props["code"],
            "language": props["language"],
            "highlightLines": props.get("highlightLines", []),
        }
    elif template == "ComparisonScene":
        rtype, data = "TwoColumnLayout", {
            "title": props["heading"],
            "left": {"heading": props["left"]["title"], "points": props["left"]["points"]},
            "right": {"heading": props["right"]["title"], "points": props["right"]["points"]},
        }
    elif template == "ChartScene":
        series = props["series"][0] if props["series"] else {"data": []}
        rtype, data = "BarChart", {
            "title": props.get("caption"),
            "bars": [{"label": f"#{i + 1}", "value": v} for i, v in enumerate(series["data"])],
        }
    elif template == "QuizScene":
        # The real quiz interactivity lives in the player's interaction panel
        # (Phase 11/12) — the video side only needs to display the question.
        rtype, data = "CalloutAnnotation", {"title": props["question"], "body": "", "bullets": props["options"]}
    elif template == "RecapScene":
        rtype, data = "NumberedList", {
            "title": props["heading"],
            "items": [{"heading": p} for p in props["points"]],
        }
    elif template == "OutroScene":
        rtype, data = "AnimatedTitle", {"title": props["message"]}
    else:
        raise ValueError(f"remotion_adapter: no component mapping for template '{template}'")

    return {
        "id": scene.id,
        "type": rtype,
        "data": data,
        "duration_frames": duration_frames,
        "transition": transition,
    }


def build_remotion_plan(plan: VideoPlan, audio_filename: str | None) -> dict[str, Any]:
    """Maps our VideoPlan into the Remotion project's VideoScriptProps JSON.
    Subtitle/caption RENDERING (CaptionLayer.tsx) is untouched — this only
    reshapes our existing subtitle timing into the Caption[] shape it already
    expects, exactly as backend/utils/captions.py does in the source branch.
    """
    captions = [
        {
            "text": s.text,
            "startMs": round(s.start * 1000),
            "endMs": round(s.end * 1000),
            "timestampMs": None,
            "confidence": None,
        }
        for s in plan.subtitles
    ]
    return {
        "title": plan.video.title,
        "fps": plan.video.fps,
        "width": plan.video.width,
        "height": plan.video.height,
        "theme": {
            "primary": plan.video.style.primaryColor,
            "secondary": _SECONDARY_ACCENT,
            "accent": _TERTIARY_ACCENT,
            "background": plan.video.style.backgroundColor,
            "font": plan.video.style.fontFamily,
        },
        "voiceover": {"provider": "deepgram", "captions": captions} if captions else None,
        "audio_url": audio_filename,
        "scenes": [_map_scene(scene, plan.video.fps) for scene in plan.scenes],
    }


def render(job_dir: Path, renderer_dir: Path, timeout_seconds: float) -> None:
    """Renders job_dir's video_plan.json via the Remotion project, writing
    rendered.mp4 back into job_dir — same on-disk contract as the Revideo path
    in adapter.py, so orchestrator.py doesn't need to know which engine ran.
    """
    plan = VideoPlan.model_validate(json.loads((job_dir / "video_plan.json").read_text(encoding="utf-8")))
    voiceover_path = job_dir / "voiceover.mp3"

    # Concurrent-safe: unique per-render filename inside the Remotion project's
    # public/ dir (staticFile() resolves relative to it) — two overlapping
    # renders never clobber each other's audio (same concern as the Revideo path).
    public_dir = renderer_dir / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    audio_filename = f"{job_dir.name}-{uuid.uuid4().hex[:8]}.mp3"
    audio_path = public_dir / audio_filename
    shutil.copyfile(voiceover_path, audio_path)

    remotion_plan = build_remotion_plan(plan, audio_filename)
    plan_path = job_dir / "remotion_plan.json"
    plan_path.write_text(json.dumps(remotion_plan, indent=2), encoding="utf-8")

    output_path = job_dir / "rendered.mp4"
    try:
        result = subprocess.run(
            [
                "npx",
                "remotion",
                "render",
                "src/index.ts",
                "EduVideo",
                str(output_path.resolve()),
                f"--props={plan_path.resolve()}",
            ],
            cwd=str(renderer_dir),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        (job_dir / "render.log").write_text(f"{result.stdout}\n{result.stderr}", encoding="utf-8")
        if result.returncode != 0:
            tail = "\n".join(result.stderr.strip().splitlines()[-20:])
            raise RuntimeError(f"render (remotion): renderer subprocess exited {result.returncode}: {tail}")
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("render (remotion): subprocess exited 0 but rendered.mp4 is missing or empty")
    finally:
        audio_path.unlink(missing_ok=True)
