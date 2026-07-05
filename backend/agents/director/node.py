import logging
from typing import Any

from graph.state import PipelineState
from .agent import run_agent
from utils.checkpoint import load_checkpoint, save_checkpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Director — syllabus → scene blueprint (picks from shortlists)
# ---------------------------------------------------------------------------
def director_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running director node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "plan")) is not None:
        logger.info("[Director] ⏩ Loaded from checkpoint")
        return {"plan": cached}

    plan = run_agent(state["syllabus"], state.get("duration_seconds", 60), state.get("context"))
    save_checkpoint(slug, "plan", plan)
    return {"plan": plan}
