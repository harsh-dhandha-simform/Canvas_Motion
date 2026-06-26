"""
backend/graph/validator.py — schema validation + targeted repair + coverage check.

For every panel, validate its `data` against the component's real JSON-Schema
(now populated via zod v4). Invalid panels get ONE small, focused LLM repair call
(just that panel, not the whole script). Also verifies every must-cover subtopic
is taught by some scene.

This is what makes the JSON reliably renderable on the frontend.
"""

import json
import logging

from component_catalog import validate_panel_data, get_schema
from utils.api import chat_completion, parse_json_robust

logger = logging.getLogger(__name__)
AGENT_NAME = "Validator"


def _repair_panel(ptype: str, data: dict, error: str) -> dict | None:
    """One targeted LLM call to fix a single panel's data against its schema."""
    schema = get_schema(ptype)
    if not schema:
        return None
    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": (
                    "You fix a single component's data so it satisfies the given JSON Schema. "
                    "Keep the real content; only add/repair what the schema requires. "
                    "Return ONLY the corrected data object as JSON — no markdown."
                )},
                {"role": "user", "content": (
                    f"Component: {ptype}\n"
                    f"Validation error: {error}\n\n"
                    f"JSON Schema:\n{json.dumps(schema)[:1800]}\n\n"
                    f"Current data:\n{json.dumps(data)[:1800]}\n\n"
                    "Return the corrected data object."
                )},
            ],
            temperature=0.2,
            agent_name=f"{AGENT_NAME}Repair",
        )
        fixed = parse_json_robust(raw, label=f"{AGENT_NAME}Repair")
        ok, _ = validate_panel_data(ptype, fixed)
        return fixed if ok else None
    except Exception as exc:
        logger.warning("[%s] repair failed for %s: %s", AGENT_NAME, ptype, exc)
        return None


def _degrade_to_text(panel: dict, scene: dict) -> None:
    """Last resort: turn an unrepairable panel into a guaranteed-valid on-screen
    textual explanation, so the scene renders meaningful text instead of a broken
    component. Uses the scene's narration (the explanation we already wrote)."""
    body = (scene.get("narration") or "").strip() or scene.get("subtitle") or scene.get("title") or ""
    panel["type"] = "CalloutAnnotation"
    panel["data"] = {"title": scene.get("title", ""), "body": body}


def validate_and_repair(scenes: list[dict], syllabus: dict) -> dict:
    """Validate + repair every panel in place. Returns a report dict."""
    checked = repaired = degraded = 0

    for sc in scenes:
        for panel in sc.get("panels", []):
            ptype = panel.get("type", "")
            data = panel.get("data") or {}
            checked += 1
            ok, error = validate_panel_data(ptype, data)
            if ok:
                continue
            logger.info("[%s] invalid %s in scene %s: %s", AGENT_NAME, ptype, sc.get("id"), error)
            fixed = _repair_panel(ptype, data, error or "")
            if fixed is not None:
                panel["data"] = fixed
                repaired += 1
            else:
                _degrade_to_text(panel, sc)
                degraded += 1
                logger.warning("[%s] %s unrepairable → degraded to CalloutAnnotation", AGENT_NAME, ptype)

    # Coverage check
    covered = {sid for sc in scenes for sid in sc.get("covers", [])}
    missing = [
        st.get("id") for st in syllabus.get("subtopics", [])
        if st.get("must_cover") and st.get("id") not in covered
    ]
    if missing:
        logger.warning("[%s] ⚠️ uncovered must-cover subtopics: %s", AGENT_NAME, missing)

    report = {
        "panels_checked": checked,
        "panels_repaired": repaired,
        "panels_degraded": degraded,
        "uncovered_subtopics": missing,
    }
    logger.info("[%s] ✅ checked=%d repaired=%d degraded=%d uncovered=%d",
                AGENT_NAME, checked, repaired, degraded, len(missing))
    return report
