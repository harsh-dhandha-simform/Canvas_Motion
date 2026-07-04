import logging
from typing import Any

from graph.state import PipelineState
from .agent import run_agent
from utils.checkpoint import load_checkpoint, save_checkpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 2b — parallel fan-out: visual data (disjoint panels)
# ---------------------------------------------------------------------------
def visual_architect_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running visual architect node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "story")) is not None:
        logger.info("[VisualArchitect] ⏩ Loaded from checkpoint")
        return {"story": cached}

    story = run_agent(state["plan"], state["syllabus"])
    save_checkpoint(slug, "story", story)
    return {"story": story}
