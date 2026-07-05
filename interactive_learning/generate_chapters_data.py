"""Generates the challenge-only (no ground truth) JSON for the hardcoded
chapters page. Separate from generate_visualizer_data.py on purpose - keeps
the original 5-demo-challenge visualizer completely untouched.

Run: python3 -m interactive_learning.generate_chapters_data
"""

import json
from pathlib import Path

from interactive_learning.chapters import CHAPTERS

OUTPUT_PATH = Path(__file__).resolve().parent / "visualizer" / "chapters_data.js"


def build_dataset() -> list:
    return [
        {
            "chapter": chapter["chapter"],
            "title": chapter["title"],
            "challenges": [challenge for challenge, _ground_truth in chapter["challenges"]],
        }
        for chapter in CHAPTERS
    ]


def main() -> None:
    dataset = build_dataset()
    OUTPUT_PATH.write_text("const CHAPTERS_DATA = " + json.dumps(dataset, indent=2) + ";\n")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
