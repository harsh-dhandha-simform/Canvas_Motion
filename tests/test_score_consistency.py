"""Regression tests for the reported bug: an attempt with every correct item
plus one extra wrong item was reported as incorrect but still scored 100,
because score was computed as correct_count / len(correct) - which ignores
extra/wrong items entirely. Fixed to a Jaccard-style score (intersection /
union) for build_it_yourself/match_items, and to subtract extra_steps too
for arrange_steps. Invariant under test: score == 100 iff correct is True.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import validation


class ScoreConsistencyTest(unittest.TestCase):
    def test_build_it_yourself_extra_wrong_connection_is_not_scored_100(self):
        gt = {
            "challenge_id": "build_001",
            "correct_connections": [["frontend", "backend"], ["backend", "database"]],
        }
        # all correct connections present, plus one extra wrong one
        ua = {
            "challenge_id": "build_001",
            "connections": [["frontend", "backend"], ["backend", "database"], ["frontend", "database"]],
        }

        result = validation.validate("build_it_yourself", gt, ua)

        self.assertFalse(result["correct"])
        self.assertLess(result["score"], 100)

    def test_build_it_yourself_exact_match_still_scores_100(self):
        gt = {
            "challenge_id": "build_001",
            "correct_connections": [["frontend", "backend"], ["backend", "database"]],
        }
        ua = {"challenge_id": "build_001", "connections": [["frontend", "backend"], ["backend", "database"]]}

        result = validation.validate("build_it_yourself", gt, ua)

        self.assertTrue(result["correct"])
        self.assertEqual(result["score"], 100)

    def test_match_items_extra_wrong_match_is_not_scored_100(self):
        gt = {"challenge_id": "match_001", "correct_matches": [["l1", "r1"], ["l2", "r2"]]}
        ua = {"challenge_id": "match_001", "matches": [["l1", "r1"], ["l2", "r2"], ["l1", "r2"]]}

        result = validation.validate("match_items", gt, ua)

        self.assertFalse(result["correct"])
        self.assertLess(result["score"], 100)

    def test_arrange_steps_extra_step_is_not_scored_100(self):
        gt = {"challenge_id": "arr_001", "correct_order": ["s1", "s2", "s3"]}
        # correct steps in the right relative order, plus one bogus extra step appended
        ua = {"challenge_id": "arr_001", "ordered_ids": ["s1", "s2", "s3", "s99"]}

        result = validation.validate("arrange_steps", gt, ua)

        self.assertFalse(result["correct"])
        self.assertLess(result["score"], 100)


if __name__ == "__main__":
    unittest.main()
