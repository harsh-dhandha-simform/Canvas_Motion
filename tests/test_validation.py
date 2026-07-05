"""Regression test for the arrange_steps position off-by-one bug:
expected_position/actual_position must be 1-based (human-readable), not
raw array indices.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import validation

GROUND_TRUTH = {
    "challenge_id": "arr_001",
    "correct_order": ["s1", "s2", "s3", "s4"],
}

WRONG_ATTEMPT = {
    "challenge_id": "arr_001",
    "ordered_ids": ["s1", "s3", "s2", "s4"],
}


class ArrangeStepsPositionTest(unittest.TestCase):
    def test_wrong_positions_are_one_based(self):
        result = validation.validate("arrange_steps", GROUND_TRUTH, WRONG_ATTEMPT)

        self.assertFalse(result["correct"])
        self.assertEqual(
            result["mistakes"]["wrong_positions"],
            [
                {"step_id": "s3", "expected_position": 3, "actual_position": 2},
                {"step_id": "s2", "expected_position": 2, "actual_position": 3},
            ],
        )

    def test_correct_order_has_no_mistakes(self):
        correct_attempt = {"challenge_id": "arr_001", "ordered_ids": ["s1", "s2", "s3", "s4"]}
        result = validation.validate("arrange_steps", GROUND_TRUTH, correct_attempt)

        self.assertTrue(result["correct"])
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["mistakes"], {})


if __name__ == "__main__":
    unittest.main()
