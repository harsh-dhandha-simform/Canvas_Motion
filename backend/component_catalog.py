import json
import logging
from pathlib import Path
from config import COMPONENT_CATALOG_PATH
import jsonschema

logger = logging.getLogger(__name__)

_catalog_cache = None


def get_catalog() -> dict:
    """Load and cache the component catalog from shared/componentCatalog.json"""
    global _catalog_cache
    if _catalog_cache is not None:
        return _catalog_cache

    path = Path(COMPONENT_CATALOG_PATH)
    if not path.exists():
        logger.warning(f"Component catalog not found at {path}")
        return {}

    with open(path, "r") as f:
        _catalog_cache = json.load(f)

    return _catalog_cache


def validate_scene_data(scene_type: str, data: dict) -> bool:
    ok, _ = validate_panel_data(scene_type, data)
    return ok


def validate_panel_data(scene_type: str, data: dict) -> tuple[bool, str | None]:
    """Validate a panel's data against its catalog JSON-Schema.

    Returns (ok, error_message). Unknown component → not ok. Missing schema →
    treated as ok (nothing to check). Used by the Validator node for repair.
    """
    catalog = get_catalog()
    if scene_type not in catalog:
        return False, f"unknown component type '{scene_type}'"

    schema = catalog[scene_type].get("schema")
    if not schema or not schema.get("properties"):
        return True, None  # no real schema to validate against

    try:
        jsonschema.validate(instance=data, schema=schema)
        return True, None
    except jsonschema.exceptions.ValidationError as e:
        return False, e.message


# ---------------------------------------------------------------------------
# Planning-side accessors — what the agents need from the catalog.
# The agents NEVER see React; they only ever read this metadata + schemas.
# ---------------------------------------------------------------------------

# coarse default for components missing metadata (forward-compat for new ones)
_DEFAULT_MIN_SECONDS = 7


def component_meta(scene_type: str) -> dict:
    return get_catalog().get(scene_type, {})


def data_owner(scene_type: str) -> str:
    """'content' (Scriptwriter) | 'visual' (Visual Architect). Routes panel filling."""
    return component_meta(scene_type).get("dataOwner", "content")


def min_seconds(scene_type: str) -> float:
    return component_meta(scene_type).get("minSeconds", _DEFAULT_MIN_SECONDS)


def get_schema(scene_type: str) -> dict | None:
    schema = component_meta(scene_type).get("schema")
    return schema if schema and schema.get("properties") else None


def picker_view() -> list[dict]:
    """Lightweight component list for the Shortlister/Director — no schemas.

    Each entry: name, description, useWhen, bestAreas, category, dataOwner, tags.
    Prompt size stays bounded as the catalog grows.
    """
    out = []
    for name, info in get_catalog().items():
        out.append({
            "name": name,
            "description": info.get("description", ""),
            "useWhen": info.get("useWhen", ""),
            "bestAreas": info.get("bestAreas", []),
            "category": info.get("category", ""),
            "dataOwner": info.get("dataOwner", "content"),
            "tags": info.get("tags", []),
        })
    return out
