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

_WORDS_PER_CHUNK = 8          # caption line length
_WORDS_PER_SECOND = 2.5       # must match utils/timing reading pace


def _chunk(words: list[str], size: int) -> list[list[str]]:
    return [words[i:i + size] for i in range(0, len(words), size)] or [[]]


def build_captions(scenes: list[dict], fps: int = 30) -> list[dict]:
    """Flatten every scene's narration into a single timeline of Caption objects.

    Each scene must already have `narration`, `start_frame`, `duration_frames`.
    Caption shape: {text, startMs, endMs, timestampMs, confidence}.
    """
    captions: list[dict] = []
    for sc in scenes:
        narration = (sc.get("narration") or "").strip()
        if not narration:
            continue
        start_ms = int((sc.get("start_frame", 0) / fps) * 1000)
        scene_ms = int((sc.get("duration_frames", 0) / fps) * 1000)
        if scene_ms <= 0:
            continue

        chunks = _chunk(narration.split(), _WORDS_PER_CHUNK)
        total_words = sum(len(c) for c in chunks) or 1
        
        # FIX: The scene duration might be much longer than the narration takes to read.
        # Don't stretch the text across the whole scene. Cap the narration block to the
        # reading pace (words / 2.5 per sec).
        reading_ms = int((total_words / _WORDS_PER_SECOND) * 1000)
        usable_ms = min(reading_ms, scene_ms)
        
        cursor = start_ms
        for chunk in chunks:
            share = len(chunk) / total_words
            dur = int(usable_ms * share)
            captions.append({
                "text": " ".join(chunk),
                "startMs": cursor,
                "endMs": cursor + dur,
                "timestampMs": None,
                "confidence": None,
            })
            cursor += dur
    return captions


def build_captions_from_words(words: list[dict]) -> list[dict]:
    """
    Build captions using precise start/end word timestamps from Deepgram STT.
    word object expected: {"word": "Hello", "start": 0.0, "end": 0.5, "punctuated_word": "Hello,"}
    """
    captions: list[dict] = []
    
    for chunk_words in _chunk(words, _WORDS_PER_CHUNK):
        if not chunk_words:
            continue
            
        start_ms = int(chunk_words[0]["start"] * 1000)
        end_ms = int(chunk_words[-1]["end"] * 1000)
        text = " ".join(w.get("punctuated_word") or w["word"] for w in chunk_words)
        
        captions.append({
            "text": text,
            "startMs": start_ms,
            "endMs": end_ms,
            "timestampMs": start_ms,
            "confidence": None,
        })
        
    return captions
