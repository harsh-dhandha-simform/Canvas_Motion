"""Central loguru setup. A stdlib-logging intercept handler routes the ported
reference modules' `logging.getLogger(__name__)` calls into loguru unchanged, so
we never rewrite a reference log line. Every log carries the current job_id via a
contextvar bound in the orchestrator with `logger.contextualize(job_id=...)`."""

from __future__ import annotations

import logging
import sys

from loguru import logger


class _InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


_CONFIGURED = False


def setup_logging(level: str = "INFO") -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    logging.root.handlers = [_InterceptHandler()]
    logging.root.setLevel(level)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx"):
        logging.getLogger(name).handlers = [_InterceptHandler()]
        logging.getLogger(name).propagate = False
    logger.configure(extra={"job_id": "-"})
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        format="{time:HH:mm:ss} | {level:<7} | job={extra[job_id]} | {name}:{function}:{line} - {message}",
    )
    _CONFIGURED = True
