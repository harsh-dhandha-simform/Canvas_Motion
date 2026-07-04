import logging
from typing import Any

from app.engine.persistence import cached, persist
from app.engine.state import PipelineState

from .agent import run_agent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Researcher — topic → teaching syllabus
# ---------------------------------------------------------------------------
def researcher_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running researcher_node")
    job_id = state["job_id"]
    if (c := cached(job_id, "syllabus")) is not None:
        logger.info("[syllabus] ⏩ Loaded from artifact")
        return {"syllabus": c}

    syllabus = run_agent(state["topic"], state.get("duration_seconds", 60))
    persist(job_id, "syllabus", syllabus)
    return {"syllabus": syllabus}
