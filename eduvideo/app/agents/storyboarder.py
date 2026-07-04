"""Storyboarder agent (MASTER_CONTEXT.md §2 stage 3, §5 templates + props). Maps
each script section to one or more scenes using the fixed generic template set —
semantic intent + props only, never rendering details (colors/fonts/coordinates/
Revideo/React).
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import read_artifact, write_artifact
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.script import Script
from app.schemas.storyboard import Storyboard

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "storyboarder.md").read_text(encoding="utf-8")


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    if "\n" in text:
        first_line, rest = text.split("\n", 1)
        text = rest if first_line.strip().lower() in ("", "json") else text
    return text.strip()


def _parse_response(raw: str) -> Storyboard:
    data = json.loads(_strip_code_fence(raw))
    return Storyboard.model_validate(data)


def _build_user_prompt(analysis: ContentAnalysis, script: Script) -> str:
    lines = [
        "content_analysis.json (for technical facts + visualOpportunities hints):",
        analysis.model_dump_json(indent=2),
        "",
        "script.json (map every section below to one or more scenes, in order):",
        script.model_dump_json(indent=2),
    ]
    return "\n".join(lines)


def _validate_concept_coverage(storyboard: Storyboard, analysis: ContentAnalysis) -> None:
    valid_ids = {c.id for c in analysis.concepts}
    used_ids = {scene.concept_id for scene in storyboard.scenes}
    unknown = used_ids - valid_ids
    if unknown:
        raise ValueError(f"storyboard scenes reference unknown concept_id(s): {sorted(unknown)}")
    missing = valid_ids - used_ids
    if missing:
        raise ValueError(f"storyboard does not cover all concepts: missing {sorted(missing)}")

    # Strict, no exceptions (including quiz): the concept spine (Phase 8) requires
    # concepts to never interleave in time, which only holds if concept_id is
    # non-decreasing across scenes in narrative order.
    order_by_id = {c.id: c.order for c in analysis.concepts}
    orders = [order_by_id[scene.concept_id] for scene in storyboard.scenes]
    if orders != sorted(orders):
        raise ValueError(
            f"storyboard scenes must stay in non-decreasing concept order (a scene, "
            f"e.g. a quiz, referenced an earlier concept out of position): {orders}"
        )


def _assign_sequential_ids(storyboard: Storyboard) -> None:
    for i, scene in enumerate(storyboard.scenes, start=1):
        scene.id = f"scene_{i:03d}"


def run(job_dir: Path) -> None:
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    script = read_artifact(job_dir, "script", Script)
    user_prompt = _build_user_prompt(analysis, script)

    with span("storyboarder", input=user_prompt, topic=analysis.topic) as obs:
        llm = LLMClient()
        raw = llm.complete(_SYSTEM_PROMPT, user_prompt, json_mode=True)

        try:
            storyboard = _parse_response(raw)
            _validate_concept_coverage(storyboard, analysis)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            nudge = (
                f"{user_prompt}\n\nYour previous reply was invalid ({exc}). Reply again with ONLY "
                "valid raw JSON matching the schema exactly: every template must be one of the "
                "allowed templates with props matching that template's shape exactly, every "
                "diagram edge must reference an existing node id, and every scene's concept_id "
                "must be one of content_analysis.concepts, covering all of them — no markdown "
                "fences, no prose."
            )
            raw_retry = llm.complete(_SYSTEM_PROMPT, nudge, json_mode=True)
            try:
                storyboard = _parse_response(raw_retry)
                _validate_concept_coverage(storyboard, analysis)
            except (json.JSONDecodeError, ValidationError, ValueError) as retry_exc:
                raise ValueError(
                    f"storyboarder: LLM did not return a valid Storyboard after one retry: {retry_exc}"
                ) from retry_exc

        _assign_sequential_ids(storyboard)
        write_artifact(job_dir, "storyboard", storyboard)
        obs.update(output=storyboard.model_dump_json())
