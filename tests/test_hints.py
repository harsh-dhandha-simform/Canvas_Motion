"""Coverage for hints.py, mocking llm_client.ask so this doesn't cost a live
LLM round trip per test.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import hints

ARRANGE_STEPS_CHALLENGE = {
    "challenge_id": "arr_001",
    "challenge_type": "arrange_steps",
    "title": "Neural Network Training",
    "description": "Arrange the steps correctly",
    "learning_objective": "Understand training flow",
    "data": {
        "steps": [
            {"id": "s1", "label": "Forward Pass"},
            {"id": "s2", "label": "Compute Loss"},
            {"id": "s3", "label": "Backpropagation"},
            {"id": "s4", "label": "Update Weights"},
        ]
    },
}

BUILD_IT_YOURSELF_CHALLENGE = {
    "challenge_id": "build_001",
    "challenge_type": "build_it_yourself",
    "title": "Build Web Architecture",
    "description": "Connect components",
    "learning_objective": "Understand architecture flow",
    "data": {
        "components": [
            {"id": "frontend", "label": "Frontend"},
            {"id": "backend", "label": "Backend"},
            {"id": "database", "label": "Database"},
        ]
    },
}

SCENARIO_CHALLENGE = {
    "challenge_id": "scenario_001",
    "challenge_type": "scenario_based",
    "title": "Choose Best Model",
    "description": "Select best option",
    "learning_objective": "Model selection",
    "data": {
        "scenario": "500 images with limited GPU and high accuracy needed",
        "options": [
            {"id": "op1", "label": "CNN"},
            {"id": "op2", "label": "Transformer"},
        ],
    },
}


class HintsTest(unittest.TestCase):
    def test_generate_success_response_matches_frozen_shape(self):
        response = hints.generate_success_response()

        self.assertEqual(
            response,
            {"correct": True, "message": "Great job! You correctly completed the challenge."},
        )

    def test_generate_success_response_returns_a_fresh_copy_each_time(self):
        first = hints.generate_success_response()
        first["correct"] = False

        second = hints.generate_success_response()

        self.assertTrue(second["correct"])

    def test_generate_hint_strips_and_returns_llm_text(self):
        with patch(
            "interactive_learning.hints.llm_client.ask",
            return_value="  Two steps are swapped.  \n",
        ):
            hint = hints.generate_hint(ARRANGE_STEPS_CHALLENGE, {"wrong_positions": []})

        self.assertEqual(hint, "Two steps are swapped.")

    def test_generate_hint_sends_challenge_context_and_real_labels_to_llm(self):
        captured = {}

        def fake_ask(prompt, *args, **kwargs):
            captured["prompt"] = prompt
            return "hint text"

        mistakes = {"wrong_positions": [{"step_id": "s3", "expected_position": 3, "actual_position": 2}]}

        with patch("interactive_learning.hints.llm_client.ask", side_effect=fake_ask):
            hints.generate_hint(ARRANGE_STEPS_CHALLENGE, mistakes)

        self.assertIn("Neural Network Training", captured["prompt"])
        self.assertIn("Understand training flow", captured["prompt"])
        # the raw id alone isn't enough - the real label must be there too
        self.assertIn("s3 (Backpropagation)", captured["prompt"])
        self.assertIn("Do NOT ask the student", captured["prompt"])

    def test_generate_hint_enriches_option_ids_with_labels(self):
        captured = {}

        def fake_ask(prompt, *args, **kwargs):
            captured["prompt"] = prompt
            return "hint text"

        mistakes = {"selected": "op2", "expected": "op1"}

        with patch("interactive_learning.hints.llm_client.ask", side_effect=fake_ask):
            hints.generate_hint(SCENARIO_CHALLENGE, mistakes)

        self.assertIn("op2 (Transformer)", captured["prompt"])
        self.assertIn("op1 (CNN)", captured["prompt"])

    def test_refusal_response_triggers_a_retry(self):
        responses = iter(
            [
                "I need more context to generate a meaningful hint. Please provide more details.",
                "Backpropagation must run before updating weights, since gradients come from the loss.",
            ]
        )

        with patch("interactive_learning.hints.llm_client.ask", side_effect=lambda *a, **k: next(responses)):
            hint = hints.generate_hint(
                ARRANGE_STEPS_CHALLENGE,
                {"wrong_positions": [{"step_id": "s3", "expected_position": 3, "actual_position": 2}]},
            )

        self.assertNotIn("need more context", hint.lower())
        self.assertIn("Backpropagation", hint)

    def test_refusal_twice_falls_back_to_deterministic_hint(self):
        with patch(
            "interactive_learning.hints.llm_client.ask",
            return_value="I need more context to generate a meaningful hint. Please provide more details.",
        ):
            hint = hints.generate_hint(
                ARRANGE_STEPS_CHALLENGE,
                {"wrong_positions": [{"step_id": "s3", "expected_position": 3, "actual_position": 2}]},
            )

        self.assertNotIn("need more context", hint.lower())
        self.assertIn("Backpropagation", hint)

    def test_leaked_answer_triggers_a_retry(self):
        # reproduces the exact reported bug: hint directly states the
        # correct connection instead of just nudging toward it.
        responses = iter(
            [
                "The Backend should act as the intermediary between Frontend and "
                "Database - direct Frontend-Database connections bypass security "
                "and business logic. Connect Frontend to Backend, and let Backend "
                "handle all Database access.",
                "Should the Frontend really talk to the Database directly, or is "
                "there a layer that usually sits in between?",
            ]
        )

        with patch("interactive_learning.hints.llm_client.ask", side_effect=lambda *a, **k: next(responses)):
            hint = hints.generate_hint(
                BUILD_IT_YOURSELF_CHALLENGE,
                {
                    "wrong_connections": [["frontend", "database"]],
                    "missing_connections": [["frontend", "backend"]],
                },
            )

        self.assertNotIn("connect frontend to backend", hint.lower())

    def test_leaked_answer_twice_falls_back_to_deterministic_hint(self):
        with patch(
            "interactive_learning.hints.llm_client.ask",
            return_value="Connect Frontend to Backend, and let Backend handle all Database access.",
        ):
            hint = hints.generate_hint(
                BUILD_IT_YOURSELF_CHALLENGE,
                {
                    "wrong_connections": [["frontend", "database"]],
                    "missing_connections": [["frontend", "backend"]],
                },
            )

        self.assertNotIn("connect frontend to backend", hint.lower())

    def test_hint_that_only_mentions_the_wrong_connection_is_not_flagged_as_a_leak(self):
        # only naming the WRONG connection (not the missing/correct one) is fine -
        # that's just describing the mistake, not revealing the answer.
        with patch(
            "interactive_learning.hints.llm_client.ask",
            return_value="Should the Frontend really talk to the Database directly?",
        ):
            hint = hints.generate_hint(
                BUILD_IT_YOURSELF_CHALLENGE,
                {
                    "wrong_connections": [["frontend", "database"]],
                    "missing_connections": [["frontend", "backend"]],
                },
            )

        self.assertIn("Frontend", hint)


if __name__ == "__main__":
    unittest.main()
