import logging
from typing import Any

from graph.state import PipelineState
from .agent import run_agent
from utils.checkpoint import load_checkpoint, save_checkpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 2a — parallel fan-out: content data (narration, etc)
# ---------------------------------------------------------------------------
def scriptwriter_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running scriptwriter node")
    slug = state["checkpoint_slug"]
    if (cached := load_checkpoint(slug, "script")) is not None:
        logger.info("[Scriptwriter] ⏩ Loaded from checkpoint")
        return {"script": cached}

    script = run_agent(state["plan"], state["syllabus"])
    save_checkpoint(slug, "script", script)
    return {"script": script}
