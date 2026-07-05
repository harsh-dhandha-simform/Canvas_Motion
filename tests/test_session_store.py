"""Coverage for session_store.py."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning.session_store import InMemorySessionStore

CHALLENGE = {"challenge_id": "arr_001", "challenge_type": "arrange_steps"}
GROUND_TRUTH = {"challenge_id": "arr_001", "correct_order": ["s1", "s2"]}


class InMemorySessionStoreTest(unittest.TestCase):
    def test_create_and_get_session_round_trips(self):
        store = InMemorySessionStore()
        store.create_session(CHALLENGE, GROUND_TRUTH)

        session = store.get_session("arr_001")

        self.assertEqual(session["challenge"], CHALLENGE)
        self.assertEqual(session["ground_truth"], GROUND_TRUTH)
        self.assertEqual(session["attempts"], [])

    def test_record_attempt_appends_in_order(self):
        store = InMemorySessionStore()
        store.create_session(CHALLENGE, GROUND_TRUTH)

        attempt_1 = {"challenge_id": "arr_001", "ordered_ids": ["s2", "s1"]}
        result_1 = {"correct": False, "score": 0, "mistakes": {}}
        attempt_2 = {"challenge_id": "arr_001", "ordered_ids": ["s1", "s2"]}
        result_2 = {"correct": True, "score": 100, "mistakes": {}}

        store.record_attempt("arr_001", attempt_1, result_1)
        store.record_attempt("arr_001", attempt_2, result_2)

        session = store.get_session("arr_001")
        self.assertEqual(len(session["attempts"]), 2)
        self.assertEqual(session["attempts"][0]["user_attempt"], attempt_1)
        self.assertEqual(session["attempts"][0]["validation_result"], result_1)
        self.assertEqual(session["attempts"][1]["user_attempt"], attempt_2)
        self.assertEqual(store.attempt_count("arr_001"), 2)

    def test_sessions_for_different_challenge_ids_do_not_collide(self):
        store = InMemorySessionStore()
        store.create_session(CHALLENGE, GROUND_TRUTH)
        other_challenge = {"challenge_id": "mcq_001", "challenge_type": "multiple_choice"}
        store.create_session(other_challenge, {"challenge_id": "mcq_001", "correct_option": "a"})

        store.record_attempt("arr_001", {"challenge_id": "arr_001"}, {"correct": True})

        self.assertEqual(store.attempt_count("arr_001"), 1)
        self.assertEqual(store.attempt_count("mcq_001"), 0)

    def test_unknown_challenge_id_raises_key_error(self):
        store = InMemorySessionStore()

        with self.assertRaises(KeyError):
            store.get_session("does_not_exist")


if __name__ == "__main__":
    unittest.main()
