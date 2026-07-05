"""Schema models matching schemas/*/*.json exactly (Step 1).

Field names and shapes follow the finalized files under schemas/, not the
generic wrapper in contracts/*.json (contracts/ is not referenced by
prompts/implementation_prompt.md and its "data" envelope does not match the
flat, type-specific ground_truth/user_attempt schema files on disk).
"""

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class Challenge:
    """schemas/common/base_schema.json + per-type challenge_schema.json"""

    challenge_id: str
    challenge_type: str
    title: str
    description: str
    difficulty: str
    learning_objective: str
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, raw: dict) -> "Challenge":
        return cls(
            challenge_id=raw["challenge_id"],
            challenge_type=raw["challenge_type"],
            title=raw["title"],
            description=raw["description"],
            difficulty=raw["difficulty"],
            learning_objective=raw["learning_objective"],
            data=raw.get("data", {}),
        )


@dataclass
class ArrangeStepsGroundTruth:
    challenge_id: str
    correct_order: list[str]


@dataclass
class ArrangeStepsUserAttempt:
    challenge_id: str
    ordered_ids: list[str]


@dataclass
class BuildItYourselfGroundTruth:
    challenge_id: str
    correct_connections: list[list[str]]


@dataclass
class BuildItYourselfUserAttempt:
    challenge_id: str
    connections: list[list[str]]


@dataclass
class ScenarioBasedGroundTruth:
    challenge_id: str
    correct_option: str


@dataclass
class ScenarioBasedUserAttempt:
    challenge_id: str
    selected_option: str


@dataclass
class MultipleChoiceGroundTruth:
    challenge_id: str
    correct_option: str


@dataclass
class MultipleChoiceUserAttempt:
    challenge_id: str
    selected_option: str


@dataclass
class MatchItemsGroundTruth:
    challenge_id: str
    correct_matches: list[list[str]]


@dataclass
class MatchItemsUserAttempt:
    challenge_id: str
    matches: list[list[str]]


# Maps challenge_type -> (ground_truth_cls, user_attempt_cls)
GROUND_TRUTH_MODELS: dict[str, Any] = {
    "arrange_steps": ArrangeStepsGroundTruth,
    "build_it_yourself": BuildItYourselfGroundTruth,
    "scenario_based": ScenarioBasedGroundTruth,
    "multiple_choice": MultipleChoiceGroundTruth,
    "match_items": MatchItemsGroundTruth,
}

USER_ATTEMPT_MODELS: dict[str, Any] = {
    "arrange_steps": ArrangeStepsUserAttempt,
    "build_it_yourself": BuildItYourselfUserAttempt,
    "scenario_based": ScenarioBasedUserAttempt,
    "multiple_choice": MultipleChoiceUserAttempt,
    "match_items": MatchItemsUserAttempt,
}


def ground_truth_from_dict(challenge_type: str, raw: dict):
    return GROUND_TRUTH_MODELS[challenge_type](**raw)


def user_attempt_from_dict(challenge_type: str, raw: dict):
    return USER_ATTEMPT_MODELS[challenge_type](**raw)
