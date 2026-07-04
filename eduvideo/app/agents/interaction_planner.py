"""Interaction Planner agent (MASTER_CONTEXT.md §2 stage 8, §5.2 hybrid library).
For each concept in the spine, picks ONE interactive component for the right-hand
panel — a fixed-library widget by default, `custom` sandboxed code only when no
library widget fits. One LLM call for the whole spine (consistent with
script_writer/storyboarder — cheaper and faster than one call per concept), not one
call per concept; per-concept granularity is still enforced by validation below.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import read_artifact, write_artifact
from app.schemas.concepts import Concepts
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.interactions import Interactions
from app.schemas.storyboard import Storyboard

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "interaction_planner.md").read_text(encoding="utf-8")


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    if "\n" in text:
        first_line, rest = text.split("\n", 1)
        text = rest if first_line.strip().lower() in ("", "json") else text
    return text.strip()


def _parse_response(raw: str) -> Interactions:
    data = json.loads(_strip_code_fence(raw))
    return Interactions.model_validate(data)


def _build_user_prompt(concepts: Concepts, analysis: ContentAnalysis, storyboard: Storyboard) -> str:
    lines = [
        "concepts.json (exactly one interaction per concept, in this order):",
        concepts.model_dump_json(indent=2),
        "",
        "content_analysis.json (technicalDetails + visualOpportunities hints):",
        analysis.model_dump_json(indent=2),
        "",
        "storyboard.json (reuse a concept's diagram/code where relevant):",
        storyboard.model_dump_json(indent=2),
    ]
    return "\n".join(lines)


def _validate_concept_coverage(interactions: Interactions, concepts: Concepts) -> None:
    valid_ids = {c.id for c in concepts.concepts}
    used_ids = [i.concept_id for i in interactions.interactions]
    unknown = set(used_ids) - valid_ids
    if unknown:
        raise ValueError(f"interactions reference unknown concept_id(s): {sorted(unknown)}")
    missing = valid_ids - set(used_ids)
    if missing:
        raise ValueError(f"interactions missing for concept(s): {sorted(missing)}")
    duplicates = sorted({cid for cid in used_ids if used_ids.count(cid) > 1})
    if duplicates:
        raise ValueError(f"more than one interaction for concept(s): {duplicates}")


def run(job_dir: Path) -> None:
    concepts = read_artifact(job_dir, "concepts", Concepts)
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    storyboard = read_artifact(job_dir, "storyboard", Storyboard)
    user_prompt = _build_user_prompt(concepts, analysis, storyboard)

    with span("interaction_planner", input=user_prompt, topic=analysis.topic) as obs:
        llm = LLMClient()
        raw = llm.complete(_SYSTEM_PROMPT, user_prompt, json_mode=True)

        try:
            interactions = _parse_response(raw)
            _validate_concept_coverage(interactions, concepts)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            nudge = (
                f"{user_prompt}\n\nYour previous reply was invalid ({exc}). Reply again with ONLY "
                "valid raw JSON matching the schema exactly: EXACTLY one interaction per concept_id "
                "in concepts.json (no missing, no duplicate, no unknown ids), each widget's props "
                "matching its type's shape exactly — no markdown fences, no prose."
            )
            raw_retry = llm.complete(_SYSTEM_PROMPT, nudge, json_mode=True)
            try:
                interactions = _parse_response(raw_retry)
                _validate_concept_coverage(interactions, concepts)
            except (json.JSONDecodeError, ValidationError, ValueError) as retry_exc:
                raise ValueError(
                    f"interaction_planner: LLM did not return valid Interactions after one retry: {retry_exc}"
                ) from retry_exc

        write_artifact(job_dir, "interactions", interactions)
        obs.update(output=interactions.model_dump_json())
