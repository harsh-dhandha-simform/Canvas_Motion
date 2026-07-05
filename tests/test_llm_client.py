"""Regression test for the two answer shapes claude_api.ask_claude() can
return, and the bug fixed in Phase 1: a bare parsed-JSON dict (no
"raw_output" wrapper) must be re-serialized to a string, not rejected.
"""

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import llm_client


class LLMClientAnswerShapeTest(unittest.TestCase):
    def test_plain_text_reply_unwraps_raw_output(self):
        fake_result = {
            "success": True,
            "answer": {"raw_output": "Great job! Two steps are swapped."},
            "stderr": "",
            "exit_code": 0,
            "duration": 1.0,
        }

        with patch("interactive_learning.llm_client.ask_claude", return_value=fake_result):
            self.assertEqual(
                llm_client.ask("some hint prompt"), "Great job! Two steps are swapped."
            )

    def test_structured_json_reply_is_reserialized_to_a_string(self):
        challenge_payload = {
            "title": "The HTTP Request Lifecycle",
            "steps": [{"id": "s1", "label": "DNS lookup"}],
            "correct_order": ["s1"],
        }

        fake_result = {
            "success": True,
            "answer": challenge_payload,
            "stderr": "",
            "exit_code": 0,
            "duration": 1.0,
        }

        with patch("interactive_learning.llm_client.ask_claude", return_value=fake_result):
            result = llm_client.ask("generate an arrange_steps challenge")

        self.assertIsInstance(result, str)
        self.assertEqual(json.loads(result), challenge_payload)

    def test_plain_string_answer_passes_through(self):
        fake_result = {
            "success": True,
            "answer": "already a plain string",
            "stderr": "",
            "exit_code": 0,
            "duration": 1.0,
        }

        with patch("interactive_learning.llm_client.ask_claude", return_value=fake_result):
            self.assertEqual(llm_client.ask("prompt"), "already a plain string")

    def test_failed_call_raises_llm_error(self):
        fake_result = {
            "success": False,
            "answer": "",
            "stderr": "Claude timed out after 120 seconds.",
            "exit_code": -1,
            "duration": 120.0,
        }

        with patch("interactive_learning.llm_client.ask_claude", return_value=fake_result):
            with self.assertRaises(llm_client.LLMError):
                llm_client.ask("prompt")


if __name__ == "__main__":
    unittest.main()
