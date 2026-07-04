"""
backend/utils/checkpoint.py — per-topic pipeline checkpoint read/write.

Each pipeline run is keyed by a slug derived from (topic, duration_seconds).
Checkpoints are stored as JSON files in backend/checkpoints/<slug>/.

Usage pattern in every node:
    if (data := load_checkpoint(slug, "syllabus")) is not None:
        return data          # skip node entirely
    result = run_expensive_llm_call()
    save_checkpoint(slug, "syllabus", result)
    return result
"""

import json
import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any, Optional

from config import CHECKPOINT_DIR

logger = logging.getLogger(__name__)


def checkpoint_slug(topic: str, duration_seconds: int) -> str:
    """Generate a deterministic, safe filesystem slug for a given run."""
    clean_topic = re.sub(r'[^a-z0-9]', '-', topic.lower())
    clean_topic = re.sub(r'-+', '-', clean_topic).strip('-')
    if not clean_topic:
        clean_topic = "unnamed"
    return f"{clean_topic}-{duration_seconds}s"


def checkpoint_dir(slug: str) -> Path:
    return Path(CHECKPOINT_DIR) / slug


def load_checkpoint(slug: str, stage: str) -> Optional[dict[str, Any]]:
    """Load a checkpoint if it exists. Returns None otherwise."""
    path = checkpoint_dir(slug) / f"{stage}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load checkpoint {path}: {e}")
        return None


def save_checkpoint(slug: str, stage: str, data: dict[str, Any]) -> None:
    """Save a checkpoint atomically to avoid partial reads on crash."""
    dir_path = checkpoint_dir(slug)
    dir_path.mkdir(parents=True, exist_ok=True)
    
    path = dir_path / f"{stage}.json"
    tmp_path = dir_path / f"{stage}.json.tmp"
    
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        
        # Atomic rename
        os.replace(tmp_path, path)
        logger.debug(f"Saved checkpoint to {path}")
    except Exception as e:
        logger.warning(f"Failed to save checkpoint {path}: {e}")
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def clear_checkpoints(slug: str) -> None:
    """Delete all checkpoints for a given slug."""
    dir_path = checkpoint_dir(slug)
    if dir_path.exists():
        try:
            shutil.rmtree(dir_path)
            logger.info(f"Cleared checkpoints for slug '{slug}'")
        except Exception as e:
            logger.warning(f"Failed to clear checkpoints at {dir_path}: {e}")
