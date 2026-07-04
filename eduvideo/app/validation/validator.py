"""Validator (MASTER_CONTEXT.md §4 "validate before render", §2 stage 9). Loads
video_plan.json, concepts.json, and interactions.json and checks every rule in
MASTER_CONTEXT §6 — independently of whatever the builders already enforced at
construction time, so a hand-edited or corrupted artifact is still caught.

Checks run against the raw JSON dicts (not typed models) so we always get a
complete list of every violation rather than stopping at Pydantic's first error.
Errors are split into two categories:
  - "content": template/prop-level issues (bad diagram edges, missing quiz option,
    out-of-range code highlight lines, ...) — these get ONE LLM-assisted repair
    attempt, feeding the errors + the bad JSON back with "fix only these errors".
  - "structural": timing sums, concept-spine linkage/coverage, missing audio file,
    and — for interactions — sandbox violations in `custom` code: these either come
    from earlier deterministic stages (no repair possible) or are untrusted code we
    deliberately never ask an LLM to "fix" (MASTER_CONTEXT §5.2/Phase 11: prefer
    failing over patching untrusted code).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.clients.llm import LLMClient
from app.clients.tracing import span
from app.jobs import write_artifact
from app.schemas.enums import AnimationPreset, ChartType, CodeLanguage, DiagramType, InteractionType, Template
from app.schemas.interactions import Interactions
from app.schemas.video_plan import VideoPlan

_TOLERANCE = 0.5

_TEMPLATE_NAMES = {t.value for t in Template}
_ANIMATION_NAMES = {a.value for a in AnimationPreset}
_DIAGRAM_TYPES = {d.value for d in DiagramType}
_CODE_LANGUAGES = {c.value for c in CodeLanguage}
_CHART_TYPES = {c.value for c in ChartType}
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


def _check_scene_props(sid: str, template: str, props: dict) -> list[dict]:
    errors: list[dict] = []

    def err(message: str) -> None:
        errors.append({"category": "content", "message": f"scene '{sid}': {message}", "scene_id": sid})

    if template == "DiagramScene":
        nodes = props.get("nodes") or []
        node_ids = {n.get("id") for n in nodes}
        if not nodes:
            err("DiagramScene has no nodes (empty diagram)")
        if props.get("diagramType") not in _DIAGRAM_TYPES:
            err(f"unsupported diagramType '{props.get('diagramType')}'")
        for e in props.get("edges") or []:
            if e.get("from") not in node_ids or e.get("to") not in node_ids:
                err(f"diagram edge references unknown node id ({e.get('from')!r} -> {e.get('to')!r})")
    elif template == "CodeScene":
        code = props.get("code") or ""
        if not code.strip():
            err("CodeScene has empty code")
        if props.get("language") not in _CODE_LANGUAGES:
            err(f"unsupported language '{props.get('language')}'")
        line_count = len(code.splitlines())
        for ln in props.get("highlightLines") or []:
            if not (1 <= ln <= line_count):
                err(f"highlightLines has out-of-range line {ln} (code has {line_count} lines)")
        for step in props.get("steps") or []:
            for ln in step.get("highlightLines") or []:
                if not (1 <= ln <= line_count):
                    err(f"steps.highlightLines has out-of-range line {ln} (code has {line_count} lines)")
    elif template == "ChartScene":
        if props.get("chartType") not in _CHART_TYPES:
            err(f"unsupported chartType '{props.get('chartType')}'")
        if not props.get("series"):
            err("ChartScene has empty series")
    elif template == "QuizScene":
        if props.get("answer") not in (props.get("options") or []):
            err("quiz answer is not one of options")
    elif template == "BulletListScene":
        if len(props.get("items") or []) < 2:
            err("BulletListScene needs >= 2 items")
    elif template == "ComparisonScene":
        if not props.get("left") or not props.get("right"):
            err("ComparisonScene missing left/right")

    return errors


def _check_video_plan(plan: dict, concept_ids: set[str]) -> list[dict]:
    errors: list[dict] = []
    video = plan.get("video") or {}
    duration = video.get("durationSec")
    scenes = plan.get("scenes") or []

    total = round(sum(s.get("duration", 0.0) for s in scenes), 2)
    if duration is None or abs(total - duration) > _TOLERANCE:
        errors.append(
            {"category": "structural", "message": f"sum(scene.duration)={total} != video.durationSec={duration}"}
        )

    cursor = 0.0
    for s in sorted(scenes, key=lambda s: s.get("start", 0.0)):
        start = s.get("start", 0.0)
        if abs(start - cursor) > _TOLERANCE:
            errors.append(
                {
                    "category": "structural",
                    "message": f"scene '{s.get('id')}' starts at {start}, expected ~{round(cursor, 2)} (gap/overlap)",
                    "scene_id": s.get("id"),
                }
            )
        cursor = start + s.get("duration", 0.0)

    for s in scenes:
        sid, template, props = s.get("id"), s.get("template"), s.get("props") or {}
        if template not in _TEMPLATE_NAMES:
            errors.append({"category": "content", "message": f"scene '{sid}': unknown template '{template}'", "scene_id": sid})
            continue
        if s.get("animation") not in _ANIMATION_NAMES:
            errors.append(
                {"category": "content", "message": f"scene '{sid}': unknown animation '{s.get('animation')}'", "scene_id": sid}
            )
        if s.get("concept_id") not in concept_ids:
            errors.append(
                {
                    "category": "structural",
                    "message": f"scene '{sid}': concept_id '{s.get('concept_id')}' not found in concepts.json",
                    "scene_id": sid,
                }
            )
        errors.extend(_check_scene_props(sid, template, props))

    subtitles = plan.get("subtitles") or []
    prev_end = 0.0
    for i, sub in enumerate(subtitles):
        start, end = sub.get("start", 0.0), sub.get("end", 0.0)
        if start < -_TOLERANCE or (duration is not None and end > duration + _TOLERANCE):
            errors.append({"category": "structural", "message": f"subtitle {i} out of bounds: [{start}, {end}]"})
        if i > 0 and start + _TOLERANCE < prev_end:
            errors.append(
                {"category": "structural", "message": f"subtitle {i} overlaps previous (start={start} < prev_end={prev_end})"}
            )
        prev_end = end

    return errors


def _check_concepts(concepts_doc: dict, video_duration: float | None) -> list[dict]:
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
    if video_duration is not None and total is not None and abs(total - video_duration) > _TOLERANCE:
        errors.append(
            {
                "category": "structural",
                "message": f"concepts.totalDurationSec={total} != video.durationSec={video_duration}",
            }
        )
    return errors


def _run_plan_checks(plan: dict, concepts_doc: dict, job_dir: Path) -> list[dict]:
    concept_ids = {c.get("id") for c in concepts_doc.get("concepts") or []}
    errors = _check_video_plan(plan, concept_ids)
    errors += _check_concepts(concepts_doc, (plan.get("video") or {}).get("durationSec"))
    if not (job_dir / "voiceover.mp3").exists():
        errors.append({"category": "structural", "message": "voiceover.mp3 does not exist on disk"})
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


def _attempt_repair_video_plan(plan: dict, content_messages: list[str]) -> dict | None:
    system = (
        "You are fixing a JSON video plan for an educational video pipeline. You will be "
        "given the current video_plan.json and a list of validation errors found in it. "
        "Return a corrected video_plan.json that fixes ONLY the listed errors — preserve "
        "every other field, scene, wording, and structure exactly as-is. Return RAW JSON "
        "only: no markdown fences, no prose, no explanation."
    )
    user = (
        f"Current video_plan.json:\n{json.dumps(plan, indent=2)}\n\n"
        "Validation errors to fix:\n" + "\n".join(f"- {m}" for m in content_messages)
    )
    with span("validator_repair_video_plan", input=user) as obs:
        try:
            raw = LLMClient().complete(system, user, json_mode=True)
            repaired = json.loads(_strip_code_fence(raw))
            obs.update(output="repair produced a candidate video_plan.json")
            return repaired
        except Exception as exc:
            obs.update(output=f"repair failed: {exc}", level="ERROR")
            return None


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
    plan = json.loads((job_dir / "video_plan.json").read_text(encoding="utf-8"))
    concepts_doc = json.loads((job_dir / "concepts.json").read_text(encoding="utf-8"))
    interactions_doc = json.loads((job_dir / "interactions.json").read_text(encoding="utf-8"))
    concept_ids = {c.get("id") for c in concepts_doc.get("concepts") or []}

    with span("validate") as obs:
        plan_errors = _run_plan_checks(plan, concepts_doc, job_dir)
        interaction_errors = _check_interactions(interactions_doc, concept_ids)
        plan_repaired = False
        interactions_repaired = False

        plan_content_messages = [e["message"] for e in plan_errors if e["category"] == "content"]
        if plan_content_messages:
            candidate = _attempt_repair_video_plan(plan, plan_content_messages)
            if candidate is not None:
                candidate_errors = _run_plan_checks(candidate, concepts_doc, job_dir)
                if not candidate_errors:
                    write_artifact(job_dir, "video_plan", VideoPlan.model_validate(candidate), overwrite=True)
                    plan_errors = []
                    plan_repaired = True
                else:
                    plan_errors = candidate_errors

        interaction_content_messages = [e["message"] for e in interaction_errors if e["category"] == "content"]
        if interaction_content_messages:
            candidate = _attempt_repair_interactions(interactions_doc, interaction_content_messages)
            if candidate is not None:
                candidate_errors = _check_interactions(candidate, concept_ids)
                if not candidate_errors:
                    write_artifact(job_dir, "interactions", Interactions.model_validate(candidate), overwrite=True)
                    interaction_errors = []
                    interactions_repaired = True
                else:
                    interaction_errors = candidate_errors

        errors = plan_errors + interaction_errors
        if errors:
            (job_dir / "validation_errors.json").write_text(
                json.dumps(
                    {"errors": errors, "plan_repair_attempted": bool(plan_content_messages), "interactions_repair_attempted": bool(interaction_content_messages)},
                    indent=2,
                ),
                encoding="utf-8",
            )
            obs.update(output=f"FAILED: {len(errors)} error(s)", level="ERROR")
            raise ValueError(f"validation failed with {len(errors)} error(s); see validation_errors.json")

        obs.update(
            output=f"OK (video_plan_repaired={plan_repaired}, interactions_repaired={interactions_repaired})"
        )
