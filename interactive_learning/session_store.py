"""Session/state handling, per the "Session Rules" section of
prompts/implementation_prompt.md.

In-memory for now; keyed exactly the way a future DB table would be
(challenge_id as primary key, attempts as an ordered list), so moving to a
database later needs no converter - just a different storage backend behind
the same methods.
"""


class InMemorySessionStore:
    def __init__(self):
        self._sessions: dict[str, dict] = {}

    def create_session(self, challenge: dict, ground_truth: dict) -> None:
        challenge_id = challenge["challenge_id"]

        self._sessions[challenge_id] = {
            "challenge": challenge,
            "ground_truth": ground_truth,
            "attempts": [],
        }

    def get_session(self, challenge_id: str) -> dict:
        return self._sessions[challenge_id]

    def record_attempt(self, challenge_id: str, user_attempt: dict, validation_result: dict) -> None:
        self._sessions[challenge_id]["attempts"].append(
            {"user_attempt": user_attempt, "validation_result": validation_result}
        )

    def attempt_count(self, challenge_id: str) -> int:
        return len(self._sessions[challenge_id]["attempts"])
