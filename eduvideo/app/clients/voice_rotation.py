"""Round-robin voice rotation across `config.tts.voice_models`, so consecutive
video generations don't all use the same Deepgram voice. One voice is picked per
job (not per TTS call within a job — a single video stays in one voice) by
persisting a small rotation counter on disk; every new job advances it to the next
voice, wrapping back to the first after all voices have been used once.
"""

from __future__ import annotations

import json

from app.config import BASE_DIR, get_settings

_STATE_PATH = BASE_DIR / ".voice_rotation_state.json"


def next_voice_model() -> str:
    settings = get_settings()
    models = settings.config.tts.voice_models
    if not models:
        return settings.config.tts.model

    index = 0
    if _STATE_PATH.exists():
        try:
            index = int(json.loads(_STATE_PATH.read_text(encoding="utf-8")).get("index", 0))
        except (ValueError, OSError):
            index = 0

    model = models[index % len(models)]
    _STATE_PATH.write_text(json.dumps({"index": index + 1}), encoding="utf-8")
    return model
