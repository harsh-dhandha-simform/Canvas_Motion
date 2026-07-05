"""Thin wrapper around the existing Claude bridge in claude_api.py.

claude_api.ask_claude() shells out to the `claude` CLI already authenticated
on this machine - no separate API key/credential is needed for this module.
Importing claude_api is safe: the HTTP server only starts under
`if __name__ == "__main__"`.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from claude_api import ask_claude  # noqa: E402


class LLMError(RuntimeError):
    pass


def ask(query: str, model: str | None = None, effort: str | None = None) -> str:
    result = ask_claude(query=query, model=model, effort=effort)

    if not result["success"]:
        raise LLMError(result["stderr"] or "claude CLI call failed with no stderr")

    answer = result["answer"]

    if isinstance(answer, str):
        return answer

    # ask_claude() JSON-parses the CLI's stdout. Plain-text replies (e.g.
    # hints) fail that parse and come back as {"raw_output": text}. Prompts
    # that ask for JSON directly (e.g. generation.py) succeed that parse and
    # come back as the already-parsed object itself - re-serialize so every
    # caller here always gets a plain string to work with.
    if isinstance(answer, dict):
        if "raw_output" in answer:
            return answer["raw_output"]
        return json.dumps(answer)

    raise LLMError(f"Unrecognized answer shape from claude CLI: {answer!r}")
