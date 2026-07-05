"""Challenge generation (Step 3).

Produces the Challenge JSON (frontend-safe) and Ground Truth JSON (hidden
answer key) for a given topic + selected challenge_type, enforcing the
per-type limits in configs/content_limits.md. No fabricated fallback data:
if the LLM response is malformed or violates limits, this raises instead of
silently accepting/patching it.
"""

import json
import uuid

from interactive_learning import llm_client
from interactive_learning.constants import LIMITS

GENERATION_PROMPT_TEMPLATES = {
    "arrange_steps": """Generate an "arrange_steps" interactive challenge for the \
lesson topic "{topic}".

Lesson summary: {lesson_summary}

Rules:
- {min_steps} to {max_steps} steps, each a meaningful action (not a trivial \
substep, not multiple actions combined)
- Steps must be in a single correct logical order

Respond with ONLY this JSON shape, no prose:
{{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "learning_objective": "string",
  "steps": [{{"id": "s1", "label": "string"}}, ...],
  "correct_order": ["s1", ...]
}}""",
    "build_it_yourself": """Generate a "build_it_yourself" interactive challenge for \
the lesson topic "{topic}".

Lesson summary: {lesson_summary}

Rules:
- {min_components} to {max_components} components, each a real, connectable entity
- {min_connections} to {max_connections} correct connections between component ids

Respond with ONLY this JSON shape, no prose:
{{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "learning_objective": "string",
  "components": [{{"id": "c1", "label": "string"}}, ...],
  "correct_connections": [["c1", "c2"], ...]
}}""",
    "scenario_based": """Generate a "scenario_based" interactive challenge for the \
lesson topic "{topic}".

Lesson summary: {lesson_summary}

Rules:
- {min_options} to {max_options} options, exactly one clearly strongest
- Scenario must include realistic constraints

Respond with ONLY this JSON shape, no prose:
{{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "learning_objective": "string",
  "scenario": "string",
  "options": [{{"id": "op1", "label": "string"}}, ...],
  "correct_option": "op1"
}}""",
    "multiple_choice": """Generate a "multiple_choice" interactive challenge for the \
lesson topic "{topic}".

Lesson summary: {lesson_summary}

Rules:
- {min_options} to {max_options} options, exactly one correct, distractors realistic

Respond with ONLY this JSON shape, no prose:
{{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "learning_objective": "string",
  "question": "string",
  "options": [{{"id": "a", "label": "string"}}, ...],
  "correct_option": "a"
}}""",
    "match_items": """Generate a "match_items" interactive challenge for the lesson \
topic "{topic}".

Lesson summary: {lesson_summary}

Rules:
- {min_pairs} to {max_pairs} pairs, each a meaningful, non-repetitive relationship

Respond with ONLY this JSON shape, no prose:
{{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "learning_objective": "string",
  "left": [{{"id": "l1", "label": "string"}}, ...],
  "right": [{{"id": "r1", "label": "string"}}, ...],
  "correct_matches": [["l1", "r1"], ...]
}}""",
}


class GenerationError(RuntimeError):
    pass


def _extract_json(raw_text: str) -> dict:
    start = raw_text.find("{")
    end = raw_text.rfind("}")

    if start == -1 or end == -1 or end < start:
        raise GenerationError(f"LLM response contained no JSON object: {raw_text!r}")

    try:
        return json.loads(raw_text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise GenerationError(f"LLM response was not valid JSON: {exc}") from exc


def _validate_and_split(challenge_type: str, parsed: dict, challenge_id: str):
    limits = LIMITS[challenge_type]

    if challenge_type == "arrange_steps":
        steps = parsed["steps"]
        correct_order = parsed["correct_order"]

        if not (limits["min_steps"] <= len(steps) <= limits["max_steps"]):
            raise GenerationError(
                f"arrange_steps expects {limits['min_steps']}-{limits['max_steps']} "
                f"steps, got {len(steps)}"
            )

        step_ids = {s["id"] for s in steps}

        if set(correct_order) != step_ids or len(correct_order) != len(steps):
            raise GenerationError("correct_order does not match the given steps")

        data = {"steps": steps}
        ground_truth = {"challenge_id": challenge_id, "correct_order": correct_order}

    elif challenge_type == "build_it_yourself":
        components = parsed["components"]
        connections = parsed["correct_connections"]

        if not (limits["min_components"] <= len(components) <= limits["max_components"]):
            raise GenerationError(
                f"build_it_yourself expects {limits['min_components']}-"
                f"{limits['max_components']} components, got {len(components)}"
            )

        if not (limits["min_connections"] <= len(connections) <= limits["max_connections"]):
            raise GenerationError(
                f"build_it_yourself expects {limits['min_connections']}-"
                f"{limits['max_connections']} connections, got {len(connections)}"
            )

        component_ids = {c["id"] for c in components}

        for a, b in connections:
            if a not in component_ids or b not in component_ids:
                raise GenerationError(f"connection references unknown component: {[a, b]}")

        data = {"components": components}
        ground_truth = {"challenge_id": challenge_id, "correct_connections": connections}

    elif challenge_type == "scenario_based":
        options = parsed["options"]
        correct_option = parsed["correct_option"]

        if not (limits["min_options"] <= len(options) <= limits["max_options"]):
            raise GenerationError(
                f"scenario_based expects {limits['min_options']}-{limits['max_options']} "
                f"options, got {len(options)}"
            )

        if correct_option not in {o["id"] for o in options}:
            raise GenerationError("correct_option does not match any given option id")

        data = {"scenario": parsed["scenario"], "options": options}
        ground_truth = {"challenge_id": challenge_id, "correct_option": correct_option}

    elif challenge_type == "multiple_choice":
        options = parsed["options"]
        correct_option = parsed["correct_option"]

        if not (limits["min_options"] <= len(options) <= limits["max_options"]):
            raise GenerationError(
                f"multiple_choice expects {limits['min_options']}-{limits['max_options']} "
                f"options, got {len(options)}"
            )

        if correct_option not in {o["id"] for o in options}:
            raise GenerationError("correct_option does not match any given option id")

        data = {"question": parsed["question"], "options": options}
        ground_truth = {"challenge_id": challenge_id, "correct_option": correct_option}

    elif challenge_type == "match_items":
        left = parsed["left"]
        right = parsed["right"]
        correct_matches = parsed["correct_matches"]

        if not (limits["min_pairs"] <= len(correct_matches) <= limits["max_pairs"]):
            raise GenerationError(
                f"match_items expects {limits['min_pairs']}-{limits['max_pairs']} "
                f"pairs, got {len(correct_matches)}"
            )

        left_ids = {i["id"] for i in left}
        right_ids = {i["id"] for i in right}

        for l_id, r_id in correct_matches:
            if l_id not in left_ids or r_id not in right_ids:
                raise GenerationError(f"match references unknown item id: {[l_id, r_id]}")

        data = {"left": left, "right": right}
        ground_truth = {"challenge_id": challenge_id, "correct_matches": correct_matches}

    else:
        raise GenerationError(f"Unsupported challenge_type: {challenge_type}")

    return data, ground_truth


def generate_challenge(topic: str, lesson_summary: str, challenge_type: str):
    """Returns (challenge_dict, ground_truth_dict) for the given challenge_type."""

    if challenge_type not in GENERATION_PROMPT_TEMPLATES:
        raise GenerationError(f"Unsupported challenge_type: {challenge_type}")

    prompt = GENERATION_PROMPT_TEMPLATES[challenge_type].format(
        topic=topic, lesson_summary=lesson_summary, **LIMITS[challenge_type]
    )

    raw_answer = llm_client.ask(prompt)
    parsed = _extract_json(raw_answer)

    challenge_id = f"{challenge_type}_{uuid.uuid4().hex[:8]}"
    data, ground_truth = _validate_and_split(challenge_type, parsed, challenge_id)

    challenge = {
        "challenge_id": challenge_id,
        "challenge_type": challenge_type,
        "title": parsed["title"],
        "description": parsed["description"],
        "difficulty": parsed["difficulty"],
        "learning_objective": parsed["learning_objective"],
        "data": data,
    }

    return challenge, ground_truth
