import logging
from typing import Any

from app.engine.persistence import cached, persist
from app.engine.state import PipelineState

from .agent import run_agent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Scriptwriter — content panel data + narration (parallel A)
# ---------------------------------------------------------------------------
def scriptwriter_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running scriptwriter_node")
    job_id = state["job_id"]
    if (c := cached(job_id, "script")) is not None:
        logger.info("[script] ⏩ Loaded from artifact")
        return {"script": c}

    script = run_agent(state["plan"], state["syllabus"])
    persist(job_id, "script", script)
    return {"script": script}
