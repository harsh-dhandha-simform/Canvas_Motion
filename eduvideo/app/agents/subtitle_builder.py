"""Subtitle/timing builder (MASTER_CONTEXT.md §2 stage 5). Splits voiceover segments
into short, readable caption lines and highlights content_analysis keywords —
deterministic, no LLM needed for reliability. Also invokes scene-timing
reconciliation (timing_reconcile.py), so this one pipeline stage produces both
`subtitles.json` and `scene_timings.json`, matching how MASTER_CONTEXT.md groups them
as a single stage.
"""

from __future__ import annotations

import re
from pathlib import Path

from app.agents import timing_reconcile
from app.clients.tracing import span
from app.config import get_settings
from app.jobs import read_artifact, write_artifact
from app.schemas.content_analysis import ContentAnalysis
from app.schemas.subtitles import Subtitle, Subtitles
from app.schemas.timings import Segment, Timings


def _chunk_segment_text(text: str, max_words: int, max_chars: int) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = current + [word]
        if current and (len(candidate) > max_words or len(" ".join(candidate)) > max_chars):
            chunks.append(" ".join(current))
            current = [word]
        else:
            current = candidate
    if current:
        chunks.append(" ".join(current))
    return chunks or [text]


def _find_highlights(text: str, keywords: list[str]) -> list[str]:
    found: list[str] = []
    for kw in keywords:
        if re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE) and kw not in found:
            found.append(kw)
    return found


def _split_segment(
    seg: Segment, max_words: int, max_chars: int, min_display: float, keywords: list[str]
) -> list[Subtitle]:
    chunks = _chunk_segment_text(seg.text, max_words, max_chars)
    total_chars = sum(len(c) for c in chunks) or 1
    duration = seg.end - seg.start

    subtitles: list[Subtitle] = []
    cursor = seg.start
    for i, chunk in enumerate(chunks):
        if i == len(chunks) - 1:
            chunk_duration = max(seg.end - cursor, 0.0)
        else:
            raw = duration * (len(chunk) / total_chars)
            chunk_duration = max(round(raw, 2), min(min_display, duration))
        subtitles.append(
            Subtitle(
                start=round(cursor, 2),
                end=round(cursor + chunk_duration, 2),
                text=chunk,
                highlight=_find_highlights(chunk, keywords),
            )
        )
        cursor += chunk_duration
    return subtitles


def run(job_dir: Path) -> None:
    timings = read_artifact(job_dir, "timings", Timings)
    analysis = read_artifact(job_dir, "content_analysis", ContentAnalysis)
    cfg = get_settings().config.subtitles

    with span("subtitle_builder", input=f"{len(timings.segments)} segments") as obs:
        subtitles: list[Subtitle] = []
        for seg in timings.segments:
            subtitles.extend(
                _split_segment(
                    seg, cfg.max_words_per_line, cfg.max_chars_per_line, cfg.min_display_seconds, analysis.keywords
                )
            )

        write_artifact(job_dir, "subtitles", Subtitles(items=subtitles))
        obs.update(output=f"{len(subtitles)} caption lines")

    timing_reconcile.run(job_dir)
