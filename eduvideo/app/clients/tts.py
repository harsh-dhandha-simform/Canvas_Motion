"""TTSClient: Deepgram `aura` speak API wrapper with a proportional timing fallback."""

from __future__ import annotations

from app.clients.tracing import span
from app.config import get_settings

_CHARS_PER_SECOND = 15.0  # rough speaking-rate estimate used when Deepgram gives no timings


class TTSError(Exception):
    """Raised when Deepgram TTS is not configured or the synthesis call fails."""


class TTSClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def synthesize(self, text: str) -> tuple[bytes, list[dict]]:
        """Returns (audio_bytes, timings). Timings are Deepgram's real segments when
        available, otherwise a proportional character-count estimate (never blocks).
        """
        if not self._settings.deepgram_configured:
            raise TTSError("DEEPGRAM_API_KEY is not set")

        with span("tts.synthesize", chars=len(text)):
            audio_bytes, real_timings = self._call_deepgram(text)
            timings = real_timings if real_timings else self._estimate_timings(text)
            return audio_bytes, timings

    def _call_deepgram(self, text: str) -> tuple[bytes, list[dict]]:
        from deepgram import DeepgramClient, SpeakOptions

        client = DeepgramClient(self._settings.deepgram_api_key)
        options = SpeakOptions(model="aura-asteria-en")

        try:
            response = client.speak.rest.v("1").stream_memory({"text": text}, options)
            audio_bytes = response.stream.getvalue()
        except AttributeError as exc:
            raise TTSError(
                "installed deepgram-sdk API doesn't match the expected "
                "speak.rest.v('1').stream_memory(...) call — check the installed "
                "deepgram-sdk version and adjust TTSClient._call_deepgram"
            ) from exc

        # Aura's speak API does not return word/segment-level timings; caller falls
        # back to a proportional estimate.
        return audio_bytes, []

    def _estimate_timings(self, text: str) -> list[dict]:
        segments = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
        timings: list[dict] = []
        cursor = 0.0
        for seg in segments:
            duration = max(len(seg) / _CHARS_PER_SECOND, 0.3)
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
