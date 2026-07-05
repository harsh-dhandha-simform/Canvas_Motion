import logging
from typing import Any

from graph.state import PipelineState
from .agent import run_agent
from utils.checkpoint import load_checkpoint, save_checkpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 0. Researcher — topic → teaching syllabus (subtopics, prereqs, depth)
# ---------------------------------------------------------------------------
def researcher_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running researcher node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "syllabus")) is not None:
        logger.info("[Researcher] ⏩ Loaded from checkpoint")
        return {"syllabus": cached}

    syllabus = run_agent(state["topic"], state.get("duration_seconds", 60), state.get("context"))
    save_checkpoint(slug, "syllabus", syllabus)
    return {"syllabus": syllabus}
