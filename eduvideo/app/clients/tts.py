"""TTSClient: Deepgram `aura` speak REST API wrapper with a proportional timing
fallback. Targets deepgram-sdk 7.x's generated client (`client.speak.v1.audio.generate`)
— its API shape is unrelated to older `speak.rest.v("1")` tutorials.
"""

from __future__ import annotations

import time

import httpx

from app.clients.tracing import span
from app.config import get_settings

_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_SECONDS = 2.0


class TTSError(Exception):
    """Raised when Deepgram TTS is not configured or the synthesis call fails."""


class TTSClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def synthesize(self, text: str, model: str | None = None) -> tuple[bytes, list[dict]]:
        """Returns (audio_bytes, timings). Timings are Deepgram's real segments when
        available, otherwise a proportional character-count estimate (never blocks).
        `model` overrides config.tts.model (see app/clients/voice_rotation.py — callers
        doing a full job's narration should pass the SAME model for every call).
        """
        if not self._settings.deepgram_configured:
            raise TTSError("DEEPGRAM_API_KEY is not set")

        with span("tts.synthesize", input=text, chars=len(text)) as obs:
            audio_bytes, real_timings = self._call_deepgram(text, model)
            timings = real_timings if real_timings else self._estimate_timings(text)
            obs.update(output=f"{len(audio_bytes)} bytes, {len(timings)} segment(s)")
            return audio_bytes, timings

    def _call_deepgram(self, text: str, model: str | None = None) -> tuple[bytes, list[dict]]:
        from deepgram import DeepgramClient

        tts_cfg = self._settings.config.tts
        client = DeepgramClient(api_key=self._settings.deepgram_api_key, timeout=tts_cfg.timeout_seconds)

        last_exc: Exception | None = None
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                chunks = client.speak.v1.audio.generate(
                    text=text, model=model or tts_cfg.model, encoding=tts_cfg.encoding
                )
                audio_bytes = b"".join(chunks)
                # The REST speak API does not return word/segment-level timings;
                # caller falls back to a proportional estimate.
                return audio_bytes, []
            except httpx.TransportError as exc:
                # Deepgram occasionally drops the connection mid-stream (peer closed
                # connection without sending complete message body) — transient, so
                # retry a couple of times before giving up.
                last_exc = exc
                if attempt < _MAX_ATTEMPTS:
                    time.sleep(_RETRY_BACKOFF_SECONDS * attempt)
                    continue
            except Exception as exc:
                raise TTSError(f"Deepgram speak API call failed: {exc}") from exc

        raise TTSError(
            f"Deepgram speak API call failed after {_MAX_ATTEMPTS} attempts: {last_exc}"
        ) from last_exc

    def _estimate_timings(self, text: str) -> list[dict]:
        chars_per_second = self._settings.config.tts.words_per_minute * 6 / 60  # ~6 chars/word incl. space
        segments = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
        timings: list[dict] = []
        cursor = 0.0
        for seg in segments:
            duration = max(len(seg) / chars_per_second, 0.3)
            timings.append(
                {"start": round(cursor, 2), "end": round(cursor + duration, 2), "text": seg, "estimated": True}
            )
            cursor += duration
        return timings

    def health(self) -> dict:
        """Tiny test synthesis; discards audio bytes. Never raises."""
        if not self._settings.deepgram_configured:
            return {"configured": False, "ok": False, "detail": "DEEPGRAM_API_KEY not set"}

        try:
            audio_bytes, _ = self.synthesize("test")
            return {"configured": True, "ok": len(audio_bytes) > 0, "detail": f"{len(audio_bytes)} bytes"}
        except Exception as exc:
            return {"configured": True, "ok": False, "detail": str(exc)}
