import json
import logging
from functools import lru_cache
from langchain_core.tools import tool
from component_catalog import get_catalog

logger = logging.getLogger(__name__)


@tool
def get_component_catalog() -> str:
    """
    Returns the JSON-serializable component catalog containing descriptions and schemas
    for all available frontend components. Use this to understand what UI components
    can be used in the video script.
    """
    catalog = get_catalog()
    return json.dumps(catalog, indent=2)


@tool
@lru_cache(maxsize=1)
def get_remotion_skill(topic: str) -> str:
    """
    Returns advice and best practices for creating Remotion videos.
    Useful when you need specific syntax or timing tricks for React/Remotion.
    """
    from config import REPO_ROOT
    
    skill_path = REPO_ROOT / ".agents" / "skills" / "remotion-best-practices" / "SKILL.md"
    try:
        if skill_path.exists():
            return skill_path.read_text(encoding="utf-8")
        else:
            logger.warning(f"Skill file not found at {skill_path}")
            return "Remotion best practices: Always use interpolate, Easing, and useCurrentFrame. Ensure deterministic animations."
    except Exception as e:
        logger.error(f"Error reading Remotion skill file: {e}")
        return "Remotion best practices: Always use interpolate, Easing, and useCurrentFrame. Ensure deterministic animations."


tools = [get_component_catalog, get_remotion_skill]
