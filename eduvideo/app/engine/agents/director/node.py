import logging
from typing import Any

from app.engine.persistence import cached, persist
from app.engine.state import PipelineState

from .agent import run_agent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Director — syllabus → scene blueprint
# ---------------------------------------------------------------------------
def director_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running director_node")
    job_id = state["job_id"]
    if (c := cached(job_id, "plan")) is not None:
        logger.info("[plan] ⏩ Loaded from artifact")
        return {"plan": c}

    plan = run_agent(state["syllabus"], state.get("duration_seconds", 60))
    persist(job_id, "plan", plan)
    return {"plan": plan}
