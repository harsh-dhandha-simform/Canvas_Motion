"""
backend/utils/tts.py — Deepgram Aura TTS + Nova-2 STT for perfect word alignment.

This module implements a two-pass approach:
1. TTS: Sends the full narration to Deepgram Aura to get a high-quality audio file.
2. STT: Sends the generated audio back to Deepgram Nova-2 to get precise word-level timestamps.

This provides the exact timing needed for Remotion's frame-accurate captions.
"""
import logging
import httpx
from pathlib import Path
from config import DEEPGRAM_API_KEY, AUDIO_DIR

logger = logging.getLogger(__name__)

DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"


def generate_audio_and_timestamps(text: str, slug: str) -> tuple[str, list[dict]]:
    """
    Generates TTS audio and returns the file path and word-level timestamps.
    
    Args:
        text: The full narration text.
        slug: The unique identifier for this run to use as the filename.
        
    Returns:
        A tuple of (audio_file_path, list_of_words).
        Each word in the list is a dict like:
        {"word": "Hello", "start": 0.0, "end": 0.5, "punctuated_word": "Hello,"}
    """
    if not DEEPGRAM_API_KEY:
        logger.warning("No DEEPGRAM_API_KEY set. Skipping audio generation.")
        return "", []

    if not text.strip():
        logger.info("Empty narration, skipping TTS.")
        return "", []

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    audio_path = AUDIO_DIR / f"{slug}.mp3"
    
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 1. Generate TTS audio
    logger.info(f"Generating TTS audio for slug '{slug}' (length: {len(text)} chars)")
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                DEEPGRAM_TTS_URL,
                headers=headers,
                json={"text": text}
            )
            response.raise_for_status()
            
            with open(audio_path, "wb") as f:
                f.write(response.content)
            
            logger.info(f"Saved audio to {audio_path}")
    except Exception as e:
        logger.error(f"Failed to generate TTS audio: {e}")
        return "", []

    # 2. Get STT word timestamps
    logger.info(f"Fetching STT timestamps for slug '{slug}'")
    try:
        with httpx.Client(timeout=30.0) as client:
            with open(audio_path, "rb") as audio_file:
                stt_response = client.post(
                    DEEPGRAM_STT_URL,
                    headers={
                        "Authorization": f"Token {DEEPGRAM_API_KEY}",
                        "Content-Type": "audio/mp3"
                    },
                    content=audio_file.read()
                )
                stt_response.raise_for_status()
                
                result = stt_response.json()
                words = result["results"]["channels"][0]["alternatives"][0]["words"]
                
                logger.info(f"Generated timestamps for {len(words)} words")
                return str(audio_path), words
    except Exception as e:
        logger.error(f"Failed to get STT timestamps: {e}")
        return str(audio_path), []
