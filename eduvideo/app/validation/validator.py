"""Tail validator (MASTER_CONTEXT.md §4 "validate before render", §2 stage 9).
Panel/scene validity is now enforced inside the LangGraph engine (graph_validator
node, per-panel JSON-Schema), so this stage validates only the learning-module
artifacts the tail produces: concepts.json (the concept spine) and interactions.json.

Checks run against the raw JSON dicts (not typed models) so we always get a complete
list of every violation rather than stopping at Pydantic's first error. Errors split
into two categories:
  - "content": widget prop-level issues (bad diagram edge, missing quiz option,
    unsupported language) — these get ONE LLM-assisted repair attempt.
  - "structural": concept-spine contiguity/coverage and — for interactions — sandbox
    violations in `custom` code: these come from an earlier deterministic stage (no
    repair possible) or are untrusted code we deliberately never ask an LLM to "fix"
    (MASTER_CONTEXT §5.2/Phase 11: prefer failing over patching untrusted code).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import read_json_artifact, write_artifact
from app.schemas.enums import CodeLanguage, DiagramType, InteractionType
from app.schemas.interactions import Interactions

_TOLERANCE = 0.5

_DIAGRAM_TYPES = {d.value for d in DiagramType}
_CODE_LANGUAGES = {c.value for c in CodeLanguage}
_INTERACTION_TYPES = {t.value for t in InteractionType}

# Conservative allowlist-by-exclusion: reject on any hint of network access, parent-
# frame/storage escape, or dynamic code loading. On any doubt, fail (MASTER_CONTEXT
# Phase 11 guardrail) — these patterns are intentionally broad.
_SANDBOX_FORBIDDEN_PATTERNS = [
    r"\bfetch\s*\(",
    r"\bXMLHttpRequest\b",
    r"\bWebSocket\b",
    r"\bwindow\.(parent|top)\b",
    r"\bdocument\.cookie\b",
    r"\blocalStorage\b",
    r"\bsessionStorage\b",
    r"\beval\s*\(",
    r"\bnew\s+Function\s*\(",
    r"\bimport\s*\(",
    r"<\s*script[^>]*\bsrc\s*=",
]


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    if "\n" in text:
        first_line, rest = text.split("\n", 1)
        text = rest if first_line.strip().lower() in ("", "json") else text
    return text.strip()


def _check_concepts(concepts_doc: dict) -> list[dict]:
    errors: list[dict] = []
    windows = concepts_doc.get("concepts") or []
    total = concepts_doc.get("totalDurationSec")

    cursor = 0.0
    for w in windows:
        start = w.get("start", -1.0)
        if abs(start - cursor) > _TOLERANCE:
            errors.append(
                {
                    "category": "structural",
                    "message": f"concept '{w.get('id')}' window not contiguous: starts {start}, expected ~{round(cursor, 2)}",
                }
            )
        cursor = w.get("end", cursor)

    if total is None or abs(cursor - total) > _TOLERANCE:
        errors.append(
            {"category": "structural", "message": f"concepts.totalDurationSec={total} != computed end={round(cursor, 2)}"}
        )
    return errors


def _check_custom_sandbox(label: str, code: str) -> list[dict]:
    errors: list[dict] = []
    for pattern in _SANDBOX_FORBIDDEN_PATTERNS:
        if re.search(pattern, code):
            errors.append(
                {
                    "category": "structural",
                    "message": f"{label}: custom code matches disallowed pattern /{pattern}/ — sandbox violations are never auto-repaired",
                }
            )
    return errors


def _check_interaction_props(label: str, itype: str, props: dict) -> list[dict]:
    errors: list[dict] = []

    def err(message: str) -> None:
        errors.append({"category": "content", "message": f"{label}: {message}"})

    if itype == "step_through":
        if not props.get("steps"):
            err("step_through requires non-empty steps")
    elif itype == "code_playground":
        if not props.get("initialCode"):
            err("code_playground requires initialCode")
        if props.get("language") not in _CODE_LANGUAGES:
            err(f"unsupported language '{props.get('language')}'")
    elif itype == "param_explorer":
        if not props.get("params"):
            err("param_explorer requires non-empty params")
    elif itype == "diagram_explore":
        nodes = props.get("nodes") or []
        node_ids = {n.get("id") for n in nodes}
        if not nodes:
            err("diagram_explore has no nodes")
        if props.get("diagramType") not in _DIAGRAM_TYPES:
            err(f"unsupported diagramType '{props.get('diagramType')}'")
        for e in props.get("edges") or []:
            if e.get("from") not in node_ids or e.get("to") not in node_ids:
                err(f"diagram edge references unknown node id ({e.get('from')!r} -> {e.get('to')!r})")
    elif itype == "quiz":
        if props.get("answer") not in (props.get("options") or []):
            err("quiz answer is not one of options")
    elif itype == "data_structure":
        if not props.get("structureType"):
            err("data_structure requires structureType")
    elif itype == "flashcards":
        if not props.get("cards"):
            err("flashcards requires non-empty cards")

    return errors


def _check_interactions(interactions_doc: dict, concept_ids: set[str]) -> list[dict]:
    errors: list[dict] = []
    items = interactions_doc.get("interactions") or []
    used_ids = [it.get("concept_id") for it in items]

    unknown = set(used_ids) - concept_ids
    if unknown:
        errors.append({"category": "structural", "message": f"interactions reference unknown concept_id(s): {sorted(unknown)}"})
    missing = concept_ids - set(used_ids)
    if missing:
        errors.append({"category": "structural", "message": f"interactions missing for concept(s): {sorted(missing)}"})
    duplicates = sorted({cid for cid in used_ids if used_ids.count(cid) > 1})
    if duplicates:
        errors.append({"category": "structural", "message": f"more than one interaction for concept(s): {duplicates}"})

    for it in items:
        label = f"interaction for '{it.get('concept_id')}'"
        itype = it.get("type")
        if itype not in _INTERACTION_TYPES:
            errors.append({"category": "content", "message": f"{label}: unknown type '{itype}'"})
            continue
        if itype == "custom":
            code = (it.get("custom") or {}).get("code") or ""
            if not code.strip():
                errors.append({"category": "structural", "message": f"{label}: type=custom requires custom.code"})
            else:
                errors.extend(_check_custom_sandbox(label, code))
            continue
        errors.extend(_check_interaction_props(label, itype, it.get("props") or {}))

    return errors


def _attempt_repair_interactions(interactions_doc: dict, content_messages: list[str]) -> dict | None:
    system = (
        "You are fixing a JSON interactions plan for an educational video's interactive "
        "side panel. You will be given the current interactions.json and a list of "
        "validation errors found in it. Return a corrected interactions.json that fixes "
        "ONLY the listed errors — preserve every other field, concept_id mapping, and "
        "intent exactly. NEVER modify a `custom` interaction's code. Return RAW JSON "
        "only: no markdown fences, no prose, no explanation."
    )
    user = (
        f"Current interactions.json:\n{json.dumps(interactions_doc, indent=2)}\n\n"
        "Validation errors to fix:\n" + "\n".join(f"- {m}" for m in content_messages)
    )
    with span("validator_repair_interactions", input=user) as obs:
        try:
            raw = LLMClient().complete(system, user, json_mode=True)
            repaired = json.loads(_strip_code_fence(raw))
            obs.update(output="repair produced a candidate interactions.json")
            return repaired
        except Exception as exc:
            obs.update(output=f"repair failed: {exc}", level="ERROR")
            return None


def run(job_dir: Path) -> None:
    concepts_doc = read_json_artifact(job_dir, "concepts")
    interactions_doc = read_json_artifact(job_dir, "interactions")
    if concepts_doc is None or interactions_doc is None:
        raise FileNotFoundError("validate: concepts.json and interactions.json must exist")
    concept_ids = {c.get("id") for c in concepts_doc.get("concepts") or []}

    with span("validate") as obs:
        concept_errors = _check_concepts(concepts_doc)
        interaction_errors = _check_interactions(interactions_doc, concept_ids)
        interactions_repaired = False

        # One LLM repair pass on interaction CONTENT errors only (structural errors —
        # coverage/sandbox — are never auto-repaired).
        content_messages = [e["message"] for e in interaction_errors if e["category"] == "content"]
        if content_messages:
            candidate = _attempt_repair_interactions(interactions_doc, content_messages)
            if candidate is not None:
                candidate_errors = _check_interactions(candidate, concept_ids)
                if not candidate_errors:
                    write_artifact(job_dir, "interactions", Interactions.model_validate(candidate), overwrite=True)
                    interaction_errors = []
                    interactions_repaired = True
                else:
                    interaction_errors = candidate_errors

        errors = concept_errors + interaction_errors
        if errors:
            (job_dir / "validation_errors.json").write_text(
                json.dumps(
                    {"errors": errors, "interactions_repair_attempted": bool(content_messages)},
                    indent=2,
                ),
                encoding="utf-8",
            )
            obs.update(output=f"FAILED: {len(errors)} error(s)", level="ERROR")
            raise ValueError(f"validation failed with {len(errors)} error(s); see validation_errors.json")

        obs.update(output=f"OK (interactions_repaired={interactions_repaired})")
