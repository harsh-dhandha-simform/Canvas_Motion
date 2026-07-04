"""Plain-script test (run: uv run python tests/test_tts_stt.py). Requires DEEPGRAM_API_KEY.
Synthesizes speech then transcribes it to confirm real word timings come back."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.clients.tts import TTSClient


def main() -> None:
    tts = TTSClient()
    audio, _ = tts.synthesize(
        "The quick brown fox jumps over the lazy dog near the river.", model="aura-2-neptune-en"
    )
    assert len(audio) > 0, "no audio synthesized"
    words = tts.transcribe(audio)
    assert len(words) >= 5, f"expected >=5 words, got {len(words)}: {words}"
    for w in words:
        assert isinstance(w["start"], (int, float)) and isinstance(w["end"], (int, float))
        assert w["end"] >= w["start"]
    print(f"test_tts_stt: PASS ({len(words)} words, first={words[0].get('word')})")


if __name__ == "__main__":
    main()
