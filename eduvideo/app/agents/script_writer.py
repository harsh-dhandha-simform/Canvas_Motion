"""Script Writer agent (MASTER_CONTEXT.md §2 stage 2). Turns content_analysis.json
into a sectioned narration script — the video's spoken backbone, each section tagged
to a concept_id from content_analysis so it can later map to storyboard scenes.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import read_artifact, write_artifact
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.input import JobInput
from app.schemas.script import Script

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "script_writer.md").read_text(encoding="utf-8")


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    if "\n" in text:
        first_line, rest = text.split("\n", 1)
        text = rest if first_line.strip().lower() in ("", "json") else text
    return text.strip()


def _parse_response(raw: str) -> Script:
    data = json.loads(_strip_code_fence(raw))
    return Script.model_validate(data)


def _build_user_prompt(job_input: JobInput, analysis: ContentAnalysis) -> str:
    lines = [
        f"Language: {job_input.language}",
        f"Include a quiz section: {'yes' if job_input.includeQuiz else 'no'}",
    ]
    if job_input.audience:
        lines.append(f"Audience: {job_input.audience}")
    if job_input.tone:
        lines.append(f"Tone: {job_input.tone}")
    if job_input.durationSec:
        lines.append(f"Target video length: ~{job_input.durationSec} seconds")
    lines.append("")
    lines.append("content_analysis.json:")
    lines.append(analysis.model_dump_json(indent=2))
    return "\n".join(lines)


def _validate_concept_coverage(script: Script, analysis: ContentAnalysis) -> None:
    valid_ids = {c.id for c in analysis.concepts}
    used_ids = {section.concept_id for section in script.sections}
    unknown = used_ids - valid_ids
    if unknown:
        raise ValueError(f"script sections reference unknown concept_id(s): {sorted(unknown)}")
    missing = valid_ids - used_ids
    if missing:
        raise ValueError(f"script does not cover all concepts: missing {sorted(missing)}")

    # Strict, no exceptions (including quiz): the concept spine (Phase 8) requires
    # concepts to never interleave in time, which only holds if concept_id is
    # non-decreasing across sections in narrative order.
    order_by_id = {c.id: c.order for c in analysis.concepts}
    orders = [order_by_id[section.concept_id] for section in script.sections]
    if orders != sorted(orders):
        raise ValueError(
            f"script sections must stay in non-decreasing concept order (a section, "
            f"e.g. a quiz, referenced an earlier concept out of position): {orders}"
        )


def run(job_dir: Path) -> None:
    job_input = read_artifact(job_dir, "input", JobInput)
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    user_prompt = _build_user_prompt(job_input, analysis)

    with span("script_writer", input=user_prompt, topic=job_input.topic) as obs:
        llm = LLMClient()
        raw = llm.complete(_SYSTEM_PROMPT, user_prompt, json_mode=True)

        try:
            script = _parse_response(raw)
            _validate_concept_coverage(script, analysis)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            nudge = (
                f"{user_prompt}\n\nYour previous reply was invalid ({exc}). Reply again with ONLY "
                "valid raw JSON matching the schema exactly, covering every concept_id from "
                "content_analysis.concepts and using no other ids — no markdown fences, no prose."
            )
            raw_retry = llm.complete(_SYSTEM_PROMPT, nudge, json_mode=True)
            try:
                script = _parse_response(raw_retry)
                _validate_concept_coverage(script, analysis)
            except (json.JSONDecodeError, ValidationError, ValueError) as retry_exc:
                raise ValueError(
                    f"script_writer: LLM did not return a valid Script after one retry: {retry_exc}"
                ) from retry_exc

        write_artifact(job_dir, "script", script)
        obs.update(output=script.model_dump_json())
