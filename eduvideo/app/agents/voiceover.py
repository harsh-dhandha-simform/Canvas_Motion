"""Voiceover stage (MASTER_CONTEXT.md §2 stage 4, §3.2 TTS contract). Synthesizes
narration audio via Deepgram TTS, producing `voiceover.mp3` + `timings.json`.

Synthesized per script section (not one giant blob) so segment timings stay aligned
to section boundaries — later stages (subtitles, concept spine) need to know which
part of the audio belongs to which section/concept. Deepgram's REST speak API does
not return word/segment timings, so TTSClient always falls back to a proportional
estimate; this stage stitches those per-section estimates into one contiguous
timeline (no gaps/overlaps) rather than pretending otherwise.
"""

from __future__ import annotations

from pathlib import Path

from app.clients.tracing import span
from app.clients.tts import TTSClient
from app.clients.voice_rotation import next_voice_model
from app.jobs import read_artifact, write_artifact
from app.schemas.script import Script
from app.schemas.timings import Segment, Timings


def run(job_dir: Path) -> None:
    script = read_artifact(job_dir, "script", Script)
    tts = TTSClient()
    # One voice per job (not per section) — rotated round-robin across jobs so
    # consecutive videos don't all sound identical (see voice_rotation.py).
    voice_model = next_voice_model()

    audio_chunks: list[bytes] = []
    segments: list[Segment] = []
    cursor = 0.0
    total_chars = 0
    any_estimated = False

    with span(
        "voiceover", input=f"{len(script.sections)} sections", sections=len(script.sections), voice_model=voice_model
    ) as obs:
        for section_index, section in enumerate(script.sections):
            total_chars += len(section.narration)
            audio_bytes, raw_timings = tts.synthesize(section.narration, model=voice_model)
            audio_chunks.append(audio_bytes)

            section_duration = 0.0
            for t in raw_timings:
                any_estimated = any_estimated or t["estimated"]
                segments.append(
                    Segment(
                        start=round(cursor + t["start"], 2),
                        end=round(cursor + t["end"], 2),
                        text=t["text"],
                        estimated=t["estimated"],
                        section_index=section_index,
                    )
                )
                section_duration = max(section_duration, t["end"])
            cursor += section_duration

        (job_dir / "voiceover.mp3").write_bytes(b"".join(audio_chunks))
        write_artifact(job_dir, "timings", Timings(audioFile="voiceover.mp3", durationSec=round(cursor, 2), segments=segments))
        obs.update(
            output=f"{round(cursor, 2)}s audio via {voice_model}, {len(segments)} segment(s), "
            f"{'estimated' if any_estimated else 'real'} timings, {total_chars} chars synthesized"
        )
