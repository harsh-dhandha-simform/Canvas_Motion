"""Deterministic validation logic (Step 5), per validation/validation_rules.md.

Compares User Attempt JSON fields against Ground Truth JSON fields for each
challenge type. Never uses an LLM to decide correctness.
"""

from interactive_learning.constants import ALLOWED_CHALLENGE_TYPES


class ValidationError(RuntimeError):
    pass


def _validate_arrange_steps(ground_truth: dict, user_attempt: dict) -> dict:
    correct_order = ground_truth["correct_order"]
    ordered_ids = user_attempt["ordered_ids"]

    # 1-based, human-readable positions - these are reported to the user via
    # hints, not used as internal array indices.
    correct_positions = {step_id: i + 1 for i, step_id in enumerate(correct_order)}

    missing_steps = [s for s in correct_order if s not in ordered_ids]
    extra_steps = [s for s in ordered_ids if s not in correct_order]

    wrong_positions = []
    for i, step_id in enumerate(ordered_ids):
        actual_position = i + 1
        if step_id in correct_positions and correct_positions[step_id] != actual_position:
            wrong_positions.append(
                {
                    "step_id": step_id,
                    "expected_position": correct_positions[step_id],
                    "actual_position": actual_position,
                }
            )

    is_correct = ordered_ids == correct_order
    # Penalize extra_steps too - otherwise a fully-correct sequence plus one
    # bogus extra step scores 100 while correct=False (score must be < 100
    # whenever correct is False, and only 100 when correct is True).
    score = round(
        100
        * (len(correct_order) - len(wrong_positions) - len(missing_steps) - len(extra_steps))
        / len(correct_order)
    ) if correct_order else 0
    score = max(0, min(100, score))

    mistakes = {}
    if wrong_positions:
        mistakes["wrong_positions"] = wrong_positions
    if missing_steps:
        mistakes["missing_steps"] = missing_steps
    if extra_steps:
        mistakes["extra_steps"] = extra_steps

    return {"correct": is_correct, "score": 100 if is_correct else score, "mistakes": mistakes}


def _validate_build_it_yourself(ground_truth: dict, user_attempt: dict) -> dict:
    correct_connections = {tuple(c) for c in ground_truth["correct_connections"]}
    connections = {tuple(c) for c in user_attempt["connections"]}

    missing_connections = [list(c) for c in correct_connections - connections]
    wrong_connections = [list(c) for c in connections - correct_connections]

    is_correct = not missing_connections and not wrong_connections
    # Jaccard-style score (intersection / union), not correct_count / len(correct) -
    # the latter ignores extra/wrong connections entirely, so a fully-correct
    # set plus one extra wrong connection would score 100 while correct=False.
    union_size = len(correct_connections | connections)
    correct_count = len(correct_connections & connections)
    score = round(100 * correct_count / union_size) if union_size else 0

    mistakes = {}
    if missing_connections:
        mistakes["missing_connections"] = missing_connections
    if wrong_connections:
        mistakes["wrong_connections"] = wrong_connections

    return {"correct": is_correct, "score": 100 if is_correct else score, "mistakes": mistakes}


def _validate_option_based(ground_truth: dict, user_attempt: dict) -> dict:
    correct_option = ground_truth["correct_option"]
    selected_option = user_attempt["selected_option"]

    is_correct = selected_option == correct_option
    mistakes = {} if is_correct else {"selected": selected_option, "expected": correct_option}

    return {"correct": is_correct, "score": 100 if is_correct else 0, "mistakes": mistakes}


def _validate_match_items(ground_truth: dict, user_attempt: dict) -> dict:
    correct_matches = {tuple(m) for m in ground_truth["correct_matches"]}
    matches = {tuple(m) for m in user_attempt["matches"]}

    missing_matches = [list(m) for m in correct_matches - matches]
    wrong_matches = [list(m) for m in matches - correct_matches]

    is_correct = not missing_matches and not wrong_matches
    # Same Jaccard fix as build_it_yourself - see comment there.
    union_size = len(correct_matches | matches)
    correct_count = len(correct_matches & matches)
    score = round(100 * correct_count / union_size) if union_size else 0

    mistakes = {}
    if missing_matches:
        mistakes["missing_matches"] = missing_matches
    if wrong_matches:
        mistakes["wrong_matches"] = wrong_matches

    return {"correct": is_correct, "score": 100 if is_correct else score, "mistakes": mistakes}


_VALIDATORS = {
    "arrange_steps": _validate_arrange_steps,
    "build_it_yourself": _validate_build_it_yourself,
    "scenario_based": _validate_option_based,
    "multiple_choice": _validate_option_based,
    "match_items": _validate_match_items,
}


def validate(challenge_type: str, ground_truth: dict, user_attempt: dict) -> dict:
    if challenge_type not in ALLOWED_CHALLENGE_TYPES:
        raise ValidationError(f"Unsupported challenge_type: {challenge_type}")

    if ground_truth["challenge_id"] != user_attempt["challenge_id"]:
        raise ValidationError("challenge_id mismatch between ground truth and user attempt")

    return _VALIDATORS[challenge_type](ground_truth, user_attempt)
