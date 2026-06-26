"""
backend/utils/captions.py — build on-screen captions from scene narration.

Text-only voiceover phase: the Scriptwriter already wrote each scene's narration,
and Timing already placed each scene on the frame timeline. Turning narration into
timed caption chunks is therefore pure arithmetic — no LLM, no audio yet.

Produces the @remotion/captions `Caption` shape so the frontend can render an
on-screen textual explanation, and so real TTS can later replace the estimated
timing with measured timing without changing the contract.
"""

from __future__ import annotations

FPS = 30
_WORDS_PER_CHUNK = 8          # caption line length
_WORDS_PER_SECOND = 2.5       # must match utils/timing reading pace


def _chunk(words: list[str], size: int) -> list[list[str]]:
    return [words[i:i + size] for i in range(0, len(words), size)] or [[]]


def build_captions(scenes: list[dict]) -> list[dict]:
    """Flatten every scene's narration into a single timeline of Caption objects.

    Each scene must already have `narration`, `start_frame`, `duration_frames`.
    Caption shape: {text, startMs, endMs, timestampMs, confidence}.
    """
    captions: list[dict] = []
    for sc in scenes:
        narration = (sc.get("narration") or "").strip()
        if not narration:
            continue
        start_ms = int((sc.get("start_frame", 0) / FPS) * 1000)
        scene_ms = int((sc.get("duration_frames", 0) / FPS) * 1000)
        if scene_ms <= 0:
            continue

        chunks = _chunk(narration.split(), _WORDS_PER_CHUNK)
        # Weight each chunk's share of the scene by its word count.
        total_words = sum(len(c) for c in chunks) or 1
        cursor = start_ms
        for chunk in chunks:
            share = len(chunk) / total_words
            dur = int(scene_ms * share)
            captions.append({
                "text": " ".join(chunk),
                "startMs": cursor,
                "endMs": cursor + dur,
                "timestampMs": None,   # set by real TTS/transcription later
                "confidence": None,
            })
            cursor += dur
    return captions
