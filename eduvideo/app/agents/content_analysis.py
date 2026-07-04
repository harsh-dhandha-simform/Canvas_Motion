"""Content Understanding agent (MASTER_CONTEXT.md §2 stage 1, §3.1 LLM contract).

Calls the LLM to analyze the input topic and produce a validated
`content_analysis.json`, including the ordered concept-spine seed that every later
stage tags its output to. The LLM emits JSON only; `ContentAnalysis` (Phase 2) is
the schema contract that gates whether a reply is accepted.
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

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "content_analysis.md").read_text(encoding="utf-8")


def _build_user_prompt(job_input: JobInput) -> str:
    lines = [f"Topic: {job_input.topic}"]
    if job_input.audience:
        lines.append(f"Audience: {job_input.audience}")
    if job_input.tone:
        lines.append(f"Tone: {job_input.tone}")
    if job_input.context:
        lines.append(f"Additional context: {job_input.context}")
    if job_input.durationSec:
        lines.append(f"Target video length: ~{job_input.durationSec} seconds")
    return "\n".join(lines)


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    if "\n" in text:
        first_line, rest = text.split("\n", 1)
        text = rest if first_line.strip().lower() in ("", "json") else text
    return text.strip()


def _parse_response(raw: str) -> ContentAnalysis:
    data = json.loads(_strip_code_fence(raw))
    return ContentAnalysis.model_validate(data)


def run(job_dir: Path) -> None:
    job_input = read_artifact(job_dir, "input", JobInput)
    user_prompt = _build_user_prompt(job_input)

    with span("content_analysis", input=user_prompt, topic=job_input.topic) as obs:
        llm = LLMClient()
        raw = llm.complete(_SYSTEM_PROMPT, user_prompt, json_mode=True)

        try:
            analysis = _parse_response(raw)
        except (json.JSONDecodeError, ValidationError) as exc:
            nudge = (
                f"{user_prompt}\n\nYour previous reply failed to parse as valid JSON matching "
                f"the required schema ({exc}). Reply again with ONLY valid raw JSON matching "
                "the schema exactly — no markdown fences, no prose, no explanation."
            )
            raw_retry = llm.complete(_SYSTEM_PROMPT, nudge, json_mode=True)
            try:
                analysis = _parse_response(raw_retry)
            except (json.JSONDecodeError, ValidationError) as retry_exc:
                raise ValueError(
                    f"content_analysis: LLM did not return valid ContentAnalysis JSON "
                    f"after one retry: {retry_exc}"
                ) from retry_exc

        write_artifact(job_dir, "content_analysis", analysis)
        obs.update(output=analysis.model_dump_json())
