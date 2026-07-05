"""
backend/utils/file_output.py

Helpers for writing generated VideoScript JSON files to shared/examples/.
Called by server.py after a successful pipeline run.
"""
from __future__ import annotations
import json
import logging
import re
from pathlib import Path

from config import SHARED_DIR

logger = logging.getLogger(__name__)

# Curated demo scripts committed to git and shown as Studio previews.
EXAMPLES_DIR = SHARED_DIR / "examples"
# Per-request pipeline outputs — gitignored, not committed.
GENERATED_DIR = SHARED_DIR / "generated"


def slugify_topic(topic: str) -> str:
    """
    Convert a topic string to a filesystem-safe slug.
    e.g. "Horizontal vs Vertical Scaling" → "horizontal-vs-vertical-scaling"
    """
    slug = topic.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)       # remove punctuation except dashes
    slug = re.sub(r"[\s_]+", "-", slug)         # spaces/underscores → dashes
    slug = re.sub(r"-{2,}", "-", slug)           # collapse multiple dashes
    slug = slug[:80].strip("-")                  # max 80 chars, no leading/trailing dash
    return slug


def write_example_script(script: dict, topic: str) -> Path:
    """
    Write a generated VideoScript dict to shared/generated/<slug>.json (gitignored).
    Only writes if Pydantic validation already passed (caller's responsibility).
    Returns the path written.
    """
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    slug = slugify_topic(topic)
    path = GENERATED_DIR / f"{slug}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2, ensure_ascii=False)
    logger.info("[file_output] ✅ Wrote %d-scene script to %s", len(script.get("scenes", [])), path)
    return path


def list_example_scripts() -> list[Path]:
    """Return all *.json scripts (curated demos + generated outputs), sorted by name."""
    out: list[Path] = []
    for d in (EXAMPLES_DIR, GENERATED_DIR):
        if d.exists():
            out.extend(d.glob("*.json"))
    return sorted(out)
