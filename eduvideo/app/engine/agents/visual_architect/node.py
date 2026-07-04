import logging
from typing import Any

from app.engine.persistence import cached, persist
from app.engine.state import PipelineState

from .agent import run_agent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Visual Architect — visual panel data + transitions (parallel B)
# ---------------------------------------------------------------------------
def visual_architect_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running visual_architect_node")
    job_id = state["job_id"]
    if (c := cached(job_id, "story")) is not None:
        logger.info("[story] ⏩ Loaded from artifact")
        return {"story": c}

    story = run_agent(state["plan"], state["syllabus"])
    persist(job_id, "story", story)
    return {"story": story}
