"""Generates the Challenge JSON the D3 visualizer displays.

Ground truth is intentionally NOT included here (per the frozen spec:
"Ground Truth JSON ... Must never be sent to frontend"). The visualizer now
gets live validation/hints from claude_api.py's /validate and /hint routes,
which hold ground truth server-side (see demo_challenges.py,
claude_api.py's _SESSION_STORE). This script just bakes the same 5 demo
challenges into a JS file so the static page can load them without a
fetch()/CORS issue when opened directly from disk (file://).

Run: python3 -m interactive_learning.generate_visualizer_data
"""

import json
from pathlib import Path

from interactive_learning.demo_challenges import DEMO_CHALLENGES

OUTPUT_PATH = Path(__file__).resolve().parent / "visualizer" / "data.js"


def build_dataset() -> dict:
    return {challenge["challenge_type"]: challenge for challenge, _ in DEMO_CHALLENGES}


def main() -> None:
    dataset = build_dataset()
    OUTPUT_PATH.write_text(
        "const VISUALIZER_DATA = " + json.dumps(dataset, indent=2) + ";\n"
    )
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
