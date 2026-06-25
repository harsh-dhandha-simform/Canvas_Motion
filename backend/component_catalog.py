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
    catalog = get_catalog()
    if scene_type not in catalog:
        return False

    schema = catalog[scene_type].get("schema")
    if not schema:
        return True  # No schema to validate against

    try:
        jsonschema.validate(instance=data, schema=schema)
        return True
    except jsonschema.exceptions.ValidationError as e:
        logger.error(f"Validation error for {scene_type}: {e.message}")
        return False
