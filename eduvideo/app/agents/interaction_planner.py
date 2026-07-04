"""Interaction Planner agent (MASTER_CONTEXT.md §2 stage 8, §5.2 hybrid library).
For each concept in the spine, picks ONE interactive component for the right-hand
panel — a fixed-library widget by default, `custom` sandboxed code only when no
library widget fits. One LLM call for the whole spine (cheaper and faster than one
call per concept), not one call per concept; per-concept granularity is still
enforced by validation below.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import read_artifact, read_json_artifact, write_artifact
from app.schemas.concepts import Concepts
from app.schemas.interactions import Interactions

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


def _panels_by_concept(scenes_timed: dict, video_script: dict) -> dict[str, list[dict]]:
    """For each concept id, the panels (type + data) of the video scenes that cover it —
    so the planner can reuse a diagram/code the learner is already seeing. Joins
    scenes_timed (which carries `covers`) to the VideoScript scenes (which carry the
    covers-stripped panels) by scene id, falling back to positional order."""
    vs_scenes = video_script.get("scenes", [])
    vs_by_id = {s.get("id"): s for s in vs_scenes}
    out: dict[str, list[dict]] = {}
    for idx, st in enumerate(scenes_timed.get("scenes", [])):
        vscene = vs_by_id.get(st.get("id")) or (vs_scenes[idx] if idx < len(vs_scenes) else {})
        panels = [{"type": p.get("type"), "data": p.get("data")} for p in (vscene.get("panels") or [])]
        for cid in st.get("covers") or []:
            out.setdefault(cid, []).extend(panels)
    return out


def _build_user_prompt(concepts: Concepts, syllabus: dict, panels_by_concept: dict[str, list[dict]]) -> str:
    subs = {st["id"]: st for st in syllabus.get("subtopics", [])}
    concept_blocks = []
    for c in concepts.concepts:
        st = subs.get(c.id, {})
        concept_blocks.append(
            {
                "concept_id": c.id,
                "title": c.title,
                "description": c.description,
                "teaching_goal": st.get("teaching_goal"),
                "depth_notes": st.get("depth_notes"),
                "must_cover": st.get("must_cover"),
                "scene_panels": panels_by_concept.get(c.id, []),
            }
        )
    lines = [
        "concepts (produce EXACTLY one interaction per concept_id, in this order):",
        json.dumps(concept_blocks, indent=2),
        "",
        "Global key terms: " + ", ".join(syllabus.get("key_terms", [])),
        "Common misconceptions: " + json.dumps(syllabus.get("misconceptions", [])),
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
    syllabus = read_json_artifact(job_dir, "syllabus") or {}
    scenes_timed = read_json_artifact(job_dir, "scenes_timed") or {}
    video_script = read_json_artifact(job_dir, "video_script") or {}
    panels_by_concept = _panels_by_concept(scenes_timed, video_script)
    user_prompt = _build_user_prompt(concepts, syllabus, panels_by_concept)

    with span("interaction_planner", input=user_prompt, topic=syllabus.get("topic")) as obs:
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
