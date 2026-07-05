"""Hardcoded end-to-end demo (Step 8), per the "Hardcoded Demo Requirement"
section of prompts/implementation_prompt.md.

Topic: Neural Network Training -> arrange_steps. The challenge/ground truth
JSON below are exactly the examples already frozen in
schemas/arrange_steps/challenge_schema.json and
schemas/arrange_steps/ground_truth_schema.json; the wrong first attempt is
the exact example from hints/hint_generation_flow.md. This does not
generalize the loop - it proves it end to end before selection/generation
are exercised on new topics.
"""

from interactive_learning import hints, validation
from interactive_learning.session_store import InMemorySessionStore

CHALLENGE = {
    "challenge_id": "arr_001",
    "challenge_type": "arrange_steps",
    "title": "Neural Network Training",
    "description": "Arrange the steps correctly",
    "difficulty": "easy",
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

GROUND_TRUTH = {
    "challenge_id": "arr_001",
    "correct_order": ["s1", "s2", "s3", "s4"],
}

WRONG_ATTEMPT = {
    "challenge_id": "arr_001",
    "ordered_ids": ["s1", "s3", "s2", "s4"],
}

CORRECT_ATTEMPT = {
    "challenge_id": "arr_001",
    "ordered_ids": ["s1", "s2", "s3", "s4"],
}


def run_demo() -> None:
    store = InMemorySessionStore()
    store.create_session(CHALLENGE, GROUND_TRUTH)

    print("Challenge JSON (sent to frontend):")
    print(CHALLENGE)
    print()

    # --- Attempt 1: wrong ---
    result_1 = validation.validate("arrange_steps", GROUND_TRUTH, WRONG_ATTEMPT)
    store.record_attempt("arr_001", WRONG_ATTEMPT, result_1)

    print("Attempt 1 (User Attempt JSON):", WRONG_ATTEMPT)
    print("Validation result:", result_1)

    if not result_1["correct"]:
        hint = hints.generate_hint(CHALLENGE, result_1["mistakes"])
        print("Hint:", hint)
    print()

    # --- Attempt 2: correct ---
    result_2 = validation.validate("arrange_steps", GROUND_TRUTH, CORRECT_ATTEMPT)
    store.record_attempt("arr_001", CORRECT_ATTEMPT, result_2)

    print("Attempt 2 (User Attempt JSON):", CORRECT_ATTEMPT)
    print("Validation result:", result_2)

    if result_2["correct"]:
        print("Response:", hints.generate_success_response())

    print()
    print(f"Total attempts recorded for arr_001: {store.attempt_count('arr_001')}")


if __name__ == "__main__":
    run_demo()
