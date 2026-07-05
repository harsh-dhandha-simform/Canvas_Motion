"""Challenge selection logic (Step 2).

Selects exactly one challenge type per lesson, using the rules frozen in
prompts/implementation_prompt.md / configs/challenge_config.md /
prompts/skills.md. The LLM picks the type; this module enforces that the
answer is one of the allowed types and nothing else.
"""

from interactive_learning import llm_client
from interactive_learning.constants import ALLOWED_CHALLENGE_TYPES

SELECTION_PROMPT_TEMPLATE = """You are selecting exactly one interactive challenge type \
to reinforce the following lesson.

Allowed challenge types (choose exactly one, respond with only the type name, \
nothing else):
- arrange_steps: use when a process/workflow/sequence exists and ordering matters
- build_it_yourself: use when components/architecture/relationships between \
entities exist
- scenario_based: use when tradeoffs/decision-making/constraints exist
- multiple_choice: use when definitions/recall/direct concept understanding fits best
- match_items: use when relationships/associations/pair mappings exist

Lesson topic: {topic}
Lesson summary: {lesson_summary}

Respond with only one of: arrange_steps, build_it_yourself, scenario_based, \
multiple_choice, match_items
"""


class SelectionError(RuntimeError):
    pass


def select_challenge_type(topic: str, lesson_summary: str) -> str:
    prompt = SELECTION_PROMPT_TEMPLATE.format(topic=topic, lesson_summary=lesson_summary)
    answer = llm_client.ask(prompt).strip().lower()

    for allowed in ALLOWED_CHALLENGE_TYPES:
        if allowed in answer:
            return allowed

    raise SelectionError(
        f"LLM returned a challenge type outside the allowed set: {answer!r}"
    )
