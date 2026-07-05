"""Frozen rules from prompts/implementation_prompt.md, configs/challenge_config.md
and configs/content_limits.md. Do not add challenge types or change limits here
without updating those source docs first.
"""

ARRANGE_STEPS = "arrange_steps"
BUILD_IT_YOURSELF = "build_it_yourself"
SCENARIO_BASED = "scenario_based"
MULTIPLE_CHOICE = "multiple_choice"
MATCH_ITEMS = "match_items"

ALLOWED_CHALLENGE_TYPES = (
    ARRANGE_STEPS,
    BUILD_IT_YOURSELF,
    SCENARIO_BASED,
    MULTIPLE_CHOICE,
    MATCH_ITEMS,
)

DIFFICULTIES = ("easy", "medium", "hard")

# min/max limits per challenge type, from configs/content_limits.md
LIMITS = {
    ARRANGE_STEPS: {"min_steps": 3, "max_steps": 7},
    BUILD_IT_YOURSELF: {
        "min_components": 3,
        "max_components": 8,
        "min_connections": 2,
        "max_connections": 10,
    },
    SCENARIO_BASED: {"min_options": 3, "max_options": 4},
    MULTIPLE_CHOICE: {"min_options": 3, "max_options": 4},
    MATCH_ITEMS: {"min_pairs": 2, "max_pairs": 6},
}
