"""Mistake analysis (Step 6), per hints/hint_generation_flow.md Step 2-3.

validation.validate() only returns opaque ids (step_id, component id, option
id, left/right id) - enough to render a diff, but not enough for an LLM to
say anything specific. This module enriches those ids with their real
labels and the challenge's own title/description/learning_objective, so the
hint prompt builder has actual subject-matter content to work with instead
of id soup.
"""


def label_map(challenge: dict) -> dict:
    challenge_type = challenge["challenge_type"]
    data = challenge["data"]

    if challenge_type == "arrange_steps":
        return {s["id"]: s["label"] for s in data["steps"]}

    if challenge_type == "build_it_yourself":
        return {c["id"]: c["label"] for c in data["components"]}

    if challenge_type in ("scenario_based", "multiple_choice"):
        return {o["id"]: o["label"] for o in data["options"]}

    if challenge_type == "match_items":
        labels = {i["id"]: i["label"] for i in data["left"]}
        labels.update({i["id"]: i["label"] for i in data["right"]})
        return labels

    return {}


def _enrich(value, labels: dict):
    if isinstance(value, str):
        return f"{value} ({labels[value]})" if value in labels else value
    if isinstance(value, list):
        return [_enrich(v, labels) for v in value]
    if isinstance(value, dict):
        return {k: _enrich(v, labels) for k, v in value.items()}
    return value


def build_llm_input(challenge: dict, mistakes: dict) -> dict:
    labels = label_map(challenge)

    return {
        "challenge_type": challenge["challenge_type"],
        "title": challenge["title"],
        "description": challenge["description"],
        "learning_objective": challenge["learning_objective"],
        "mistakes": _enrich(mistakes, labels),
    }
