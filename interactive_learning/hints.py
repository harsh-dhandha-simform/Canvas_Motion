"""LLM hint generation (Step 7), per hints/hint_generation_flow.md.

Correctness is never decided here - only nudges/explanations for an attempt
already marked incorrect by validation.validate().
"""

import json

from interactive_learning import llm_client
from interactive_learning.mistake_analysis import build_llm_input, label_map

SUCCESS_MESSAGE = {"correct": True, "message": "Great job! You correctly completed the challenge."}

HINT_PROMPT_TEMPLATE = """You are an educational assistant generating a hint for a student's \
incorrect attempt at an interactive challenge.

Challenge: {title}
Description: {description}
Learning objective: {learning_objective}

The student's mistake (ids are annotated with their real labels in parentheses):
{mistakes_json}

Rules:
- Everything you need is given above. Do NOT ask the student, or anyone, for \
more context, more details, or clarification, under any circumstances.
- Do not directly reveal the full correct answer.
- NEVER state which specific items should be connected/paired/ordered \
together. Do not write sentences like "Connect X to Y", "X should come \
before Y", "X should connect to Y", or any sentence that names two specific \
items joined by a connecting or ordering word (to, before, after, then).
- Instead, phrase the hint as a guiding question or a conceptual pointer \
that references the real subject matter by name, so the student has to make \
the connection themselves.
  BAD:  "Connect Frontend to Backend, and let Backend handle all Database access."
  GOOD: "Should the Frontend really talk to the Database directly, or is \
there a layer that usually sits in between to handle that?"
  BAD:  "Backpropagation needs the loss value, so compute the loss before backpropagating."
  GOOD: "Which of these two steps depends on a value the other one produces?"
- Keep it concise: 1-2 sentences.
- Respond with only the hint text. No prose, no JSON, no questions asked back \
to whoever is generating this - only the question/pointer FOR the student.
"""

RETRY_SUFFIX = """

IMPORTANT: Everything you need is already given above (title, description, \
learning objective, and the specific mistake with real labels). Do not ask for \
context or clarification under any circumstances - make your best judgement \
call and give a concrete hint right now.
"""

LEAK_RETRY_SUFFIX = """

IMPORTANT: Your previous answer directly stated which items should be \
connected/paired/ordered together - that reveals the answer, which is not \
allowed. Rephrase as a guiding question or conceptual pointer instead, \
without naming both items joined by a connecting or ordering word.
"""

# High-precision substrings for detecting an LLM response that asks for more
# context instead of giving a hint (the exact failure mode reported: "I need
# more context to generate a meaningful hint...").
_REFUSAL_MARKERS = (
    "need more context",
    "please provide",
    "once i have",
    "clarify",
    "more information",
    "more details",
    "core concept being tested",
)


def _looks_like_refusal(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in _REFUSAL_MARKERS)


def _reveals_a_correct_pair(text: str, labels: dict, pairs) -> bool:
    """Objective check for build_it_yourself/match_items: missing_connections
    and missing_matches are themselves ground-truth pairs (per
    validation.py's set difference), so if the hint text mentions both real
    labels of any such pair, it has stated the answer - not just hinted.
    """
    lowered = text.lower()

    for a, b in pairs:
        label_a = labels.get(a, a).lower()
        label_b = labels.get(b, b).lower()
        if label_a in lowered and label_b in lowered:
            return True

    return False


def _looks_like_leak(text: str, challenge: dict, mistakes: dict) -> bool:
    challenge_type = challenge["challenge_type"]

    if challenge_type == "build_it_yourself":
        pairs = mistakes.get("missing_connections", [])
    elif challenge_type == "match_items":
        pairs = mistakes.get("missing_matches", [])
    else:
        return False

    if not pairs:
        return False

    return _reveals_a_correct_pair(text, label_map(challenge), pairs)


def _fallback_hint(challenge_type: str, enriched_mistakes: dict) -> str:
    """Deterministic, non-LLM hint used only if the model refuses or leaks
    the answer twice. Still references real labels (already baked into
    enriched_mistakes by mistake_analysis.build_llm_input), phrased as a
    question rather than a direct instruction.
    """
    if challenge_type == "arrange_steps":
        if enriched_mistakes.get("wrong_positions"):
            step = enriched_mistakes["wrong_positions"][0]["step_id"]
            return f"Take another look at where {step} sits in your sequence - does it really belong there?"
        if enriched_mistakes.get("missing_steps"):
            return f"Is there a step missing from your sequence? Consider: {enriched_mistakes['missing_steps'][0]}."
        if enriched_mistakes.get("extra_steps"):
            return f"Does {enriched_mistakes['extra_steps'][0]} actually belong in this sequence?"

    if challenge_type == "build_it_yourself":
        if enriched_mistakes.get("wrong_connections"):
            a, b = enriched_mistakes["wrong_connections"][0]
            return f"Does {a} really need a direct connection to {b}? Think about how they actually relate."
        if enriched_mistakes.get("missing_connections"):
            a, _b = enriched_mistakes["missing_connections"][0]
            return f"Is {a} connected to everything it needs to be?"

    if challenge_type == "match_items":
        if enriched_mistakes.get("wrong_matches"):
            a, b = enriched_mistakes["wrong_matches"][0]
            return f"Is {a} really best suited for {b}? Reconsider what each one is actually used for."
        if enriched_mistakes.get("missing_matches"):
            a, _b = enriched_mistakes["missing_matches"][0]
            return f"Does {a} have a match yet?"

    if challenge_type in ("scenario_based", "multiple_choice"):
        selected = enriched_mistakes.get("selected")
        if selected:
            return f"Is {selected} really the strongest option given the constraints described?"

    return "You're close - review your attempt against the challenge description and try again."


def generate_success_response() -> dict:
    return dict(SUCCESS_MESSAGE)


def generate_hint(challenge: dict, mistakes: dict) -> str:
    llm_input = build_llm_input(challenge, mistakes)
    mistakes_json = json.dumps(llm_input["mistakes"])

    prompt = HINT_PROMPT_TEMPLATE.format(
        title=llm_input["title"],
        description=llm_input["description"],
        learning_objective=llm_input["learning_objective"],
        mistakes_json=mistakes_json,
    )

    hint = llm_client.ask(prompt).strip()

    if _looks_like_refusal(hint):
        hint = llm_client.ask(prompt + RETRY_SUFFIX).strip()
    elif _looks_like_leak(hint, challenge, mistakes):
        hint = llm_client.ask(prompt + LEAK_RETRY_SUFFIX).strip()

    if _looks_like_refusal(hint) or _looks_like_leak(hint, challenge, mistakes):
        return _fallback_hint(challenge["challenge_type"], llm_input["mistakes"])

    return hint
