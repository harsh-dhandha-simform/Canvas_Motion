"""Caption/narration helpers used by voiceover_node. `_chunk_segment_text` and
`_find_highlights` are lifted verbatim from the (to-be-deleted) app/agents/
subtitle_builder.py so the keyword-highlight caption behavior is preserved.
`chunk_text` is lifted from the reference backend/utils/tts.py (split narration
under Deepgram's speak char limit)."""

from __future__ import annotations

import re


def chunk_text(text: str, max_length: int = 1800) -> list[str]:
    """Split text into chunks by sentence, ensuring no chunk exceeds max_length."""
    sentences = re.split(r"(?<=[.!?]) +", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) < max_length:
            current += sentence + " "
        else:
            if current:
                chunks.append(current.strip())
            if len(sentence) > max_length:
                for i in range(0, len(sentence), max_length):
                    chunks.append(sentence[i : i + max_length])
                current = ""
            else:
                current = sentence + " "
    if current:
        chunks.append(current.strip())
    return [c for c in chunks if c.strip()]


def chunk_segment_text(text: str, max_words: int, max_chars: int) -> list[str]:
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


def find_highlights(text: str, keywords: list[str]) -> list[str]:
    found: list[str] = []
    for kw in keywords:
        if kw and re.search(rf"\b{re.escape(kw)}\b", text, re.IGNORECASE) and kw not in found:
            found.append(kw)
    return found
