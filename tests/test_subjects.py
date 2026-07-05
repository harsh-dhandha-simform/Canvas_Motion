"""Manual exploration script, not an automated test - change TOPICS below and
run this file directly to see what selection.py + generation.py produce for
any subject, end to end (real LLM calls).

Run: python3 tests/test_subjects.py

Guarded behind `if __name__ == "__main__"` on purpose: `python3 -m unittest
discover -s tests` imports every tests/test_*.py file, and this one has no
TestCase - it would otherwise fire real LLM calls on every test run.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import generation, selection

# Edit this list - one lesson_summary per topic. That's the only thing you
# need to change to try a different subject.
TOPICS = [
    {
        "topic": "Design a URL Shortener",
        "lesson_summary": (
            "Learn how a URL shortening service works, including API design, "
            "database selection, unique ID generation, caching, scalability, "
            "and handling millions of requests efficiently."
        ),
    },
]

def run_subject(topic: str, lesson_summary: str) -> None:
    print(f"\n{'=' * 80}\nTOPIC: {topic}\n{'=' * 80}")

    challenge_type = selection.select_challenge_type(topic, lesson_summary)
    print(f"selected challenge_type: {challenge_type}")

    challenge, ground_truth = generation.generate_challenge(topic, lesson_summary, challenge_type)

    print("\nChallenge JSON (safe to send to frontend):")
    print(json.dumps(challenge, indent=2))

    print("\nGround Truth JSON (server-side only, never send to frontend):")
    print(json.dumps(ground_truth, indent=2))


def main() -> None:
    for entry in TOPICS:
        try:
            run_subject(entry["topic"], entry["lesson_summary"])
        except Exception as exc:
            print(f"\nFAILED for topic {entry['topic']!r}: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
