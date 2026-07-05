"""Coverage for selection.py, mocking llm_client.ask so this doesn't cost a
live LLM round trip per test.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import selection
from interactive_learning.constants import ALLOWED_CHALLENGE_TYPES


class SelectionTest(unittest.TestCase):
    def test_accepts_each_allowed_type_exactly(self):
        for allowed in ALLOWED_CHALLENGE_TYPES:
            with self.subTest(allowed=allowed):
                with patch("interactive_learning.selection.llm_client.ask", return_value=allowed):
                    self.assertEqual(selection.select_challenge_type("topic", "summary"), allowed)

    def test_tolerates_whitespace_and_case(self):
        with patch(
            "interactive_learning.selection.llm_client.ask",
            return_value="  Arrange_Steps  \n",
        ):
            self.assertEqual(selection.select_challenge_type("topic", "summary"), "arrange_steps")

    def test_disallowed_type_raises_selection_error(self):
        with patch("interactive_learning.selection.llm_client.ask", return_value="true_false"):
            with self.assertRaises(selection.SelectionError):
                selection.select_challenge_type("topic", "summary")

    def test_empty_answer_raises_selection_error(self):
        with patch("interactive_learning.selection.llm_client.ask", return_value=""):
            with self.assertRaises(selection.SelectionError):
                selection.select_challenge_type("topic", "summary")

    def test_prompt_includes_topic_and_summary(self):
        captured = {}

        def fake_ask(prompt, *args, **kwargs):
            captured["prompt"] = prompt
            return "match_items"

        with patch("interactive_learning.selection.llm_client.ask", side_effect=fake_ask):
            selection.select_challenge_type("CNN vs RNN", "compares architectures")

        self.assertIn("CNN vs RNN", captured["prompt"])
        self.assertIn("compares architectures", captured["prompt"])


if __name__ == "__main__":
    unittest.main()
