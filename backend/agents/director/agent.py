"""
backend/agents/director.py — Agent 1: Director

Turns the Researcher's syllabus into a scene-by-scene blueprint. Picks the
layout and the components for each scene — choosing ONLY from the per-subtopic
shortlists (so the catalog can grow to hundreds without bloating this prompt).

Guarantees every must-cover subtopic is mapped to at least one scene (enforced
in Python after the LLM call; the Validator double-checks coverage later).
"""

import logging

from component_catalog import get_catalog
from component_catalog import picker_view
from graph.shortlister import build_shortlists
from utils.api import chat_completion, parse_json_robust
from .schema import DirectorPlan

logger = logging.getLogger(__name__)
AGENT_NAME = "Director"

# Layout → required area strings (mirrors models/video_script.py VALID_LAYOUTS)
LAYOUT_AREAS = {
    "full": ["panel"],
    "left-right": ["left", "right"],
    "title-content": ["main"],
    "title-left-right": ["left", "right"],
    "title-main-sidebar": ["main", "sidebar"],
}

SYSTEM_PROMPT = """
You are a Creative Director for in-depth technical education videos for senior engineers.
You are given a teaching syllabus (subtopics) and, for each subtopic, a SHORTLIST of components you
may use. Design a scene-by-scene blueprint that teaches every subtopic clearly and looks visually rich.

Output ONLY a single JSON object — no prose, no markdown fences.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## THEME — pick ONE palette that fits the topic

A (networking / distributed)  background=#030711 primary=#6366f1 secondary=#22d3ee accent=#f59e0b font="Space Grotesk"
B (systems / algorithms)      background=#0a0f1e primary=#10b981 secondary=#38bdf8 accent=#fb923c font="Outfit"
C (cloud / data / ML)         background=#050d1a primary=#8b5cf6 secondary=#34d399 accent=#22d3ee font="Inter"
D (security / infra / k8s)    background=#0d1117 primary=#ef4444 secondary=#f59e0b accent=#a3e635 font="Space Grotesk"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## LAYOUTS — areas you must use exactly

"full"                panel                     (no header) — ONLY for the hook (scene 0) and the outro (last)
"title-left-right"    left + right              (header auto-rendered) — DEFAULT for content scenes
"title-main-sidebar"  main + sidebar            main = big visual, sidebar = supporting callout
"title-content"       main                      one wide component
"left-right"          left + right              (no header) — dramatic, use at most once

A scene's panels[].area values MUST exactly match the chosen layout's areas.


## HARD RULES

1. COVERAGE: every must-cover subtopic id MUST appear in some scene's "covers". A scene may cover 1-2 subtopics.
2. SHORTLIST: a panel's "type" MUST be one of the components shortlisted for one of that scene's covered subtopics
   (the staples AnimatedTitle / TypewriterText / BulletList / CalloutAnnotation are always allowed).
3. STRUCTURE: scene 0 role="hook" layout="full" (AnimatedTitle); last scene role="outro" layout="full" (AnimatedTitle).
   All middle scenes use a header layout (title-left-right / title-main-sidebar / title-content).
4. TEXTUAL EXPLANATION: every middle scene must include at least one text/list component
   (BulletList, CalloutAnnotation, NumberedList, StepFlow, TwoColumnLayout, QuoteCard) so the idea is explained in words,
   not only shown as a diagram.
5. VARIETY: do not use the same component type in more than ~40% of scenes; vary layouts between consecutive scenes.
6. AnimatedTitle ONLY in "full" layout.

Return ONLY valid JSON.
""".strip()


def _candidate_reference(names: set[str]) -> str:
    """Compact reference (name · areas · owner · useWhen) for the shortlisted components only."""
    cat = get_catalog()
    lines = []
    for name in sorted(names):
        info = cat.get(name, {})
        areas = "/".join(info.get("bestAreas", []))
        lines.append(f"  {name}  [areas: {areas}]  → {info.get('useWhen','')}")
    return "\n".join(lines)


def run_agent(syllabus: dict, duration_seconds: int = 60) -> dict:
    topic = syllabus.get("topic", "")
    subtopics = syllabus.get("subtopics", [])
    logger.info("[%s] Planning scenes for %r (%d subtopics)", AGENT_NAME, topic, len(subtopics))

    shortlists = build_shortlists(syllabus)
    all_candidates = {n for names in shortlists.values() for n in names}

    subtopic_lines = []
    for st in subtopics:
        sid = st.get("id")
        cands = shortlists.get(sid, [])
        flag = "MUST-COVER" if st.get("must_cover") else "optional"
        subtopic_lines.append(
            f"  [{sid}] ({flag}) {st.get('title')}\n"
            f"      goal: {st.get('teaching_goal','')}\n"
            f"      depth: {st.get('depth_notes','')}\n"
            f"      candidate components: {', '.join(cands)}"
        )

    user_message = (
        f"Topic: {topic}\n"
        f"Depth level: {syllabus.get('depth_level')}\n"
        f"Target length: {duration_seconds}s\n\n"
        f"SYLLABUS (subtopics + their shortlisted components):\n"
        + "\n".join(subtopic_lines)
        + "\n\nCOMPONENT REFERENCE (only the shortlisted ones):\n"
        + _candidate_reference(all_candidates)
        + "\n\nDesign the scene blueprint. Cover every must-cover subtopic, give each middle scene a "
        "textual explanation component, and pick component types only from the candidates above. "
        "Return only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        agent_name=AGENT_NAME,
        response_model=DirectorPlan,
    )

    raw_dict: dict = parse_json_robust(raw, label=AGENT_NAME)
    raw_dict = _normalize_plan(raw_dict, syllabus)

    plan = DirectorPlan.model_validate(raw_dict)

    n_scenes = len(plan.scenes)
    logger.info("[%s] ✅ Plan: %d scenes, layouts=%s",
                AGENT_NAME, n_scenes, [s.layout for s in plan.scenes])
    return plan.model_dump()


def _normalize_plan(plan: dict, syllabus: dict) -> dict:
    """Repair structural issues deterministically: areas, intro/outro, coverage gaps."""
    scenes = plan.get("scenes") or []

    for i, sc in enumerate(scenes):
        sc["index"] = i
        layout = sc.get("layout")
        if layout not in LAYOUT_AREAS:
            layout = "title-left-right"
            sc["layout"] = layout
        # Force intro/outro to full + AnimatedTitle
        is_first, is_last = (i == 0), (i == len(scenes) - 1)
        if is_first or is_last:
            sc["layout"] = "full"
            sc["panels"] = [{"area": "panel", "type": "AnimatedTitle"}]
            sc["role"] = "hook" if is_first else "outro"
            continue
        # Align panel areas to the layout's required areas
        required = LAYOUT_AREAS[sc["layout"]]
        panels = sc.get("panels") or []
        fixed = []
        for area, panel in zip(required, panels):
            fixed.append({"area": area, "type": (panel or {}).get("type", "BulletList")})
        # if LLM gave fewer panels than the layout needs, fill remaining areas with a text panel
        for area in required[len(fixed):]:
            fixed.append({"area": area, "type": "BulletList"})
        sc["panels"] = fixed
        sc.setdefault("covers", [])

    # Coverage repair: any must-cover subtopic not in any scene → attach to nearest middle scene
    covered = {sid for sc in scenes for sid in sc.get("covers", [])}
    middle = [sc for sc in scenes if sc.get("role") not in ("hook", "outro")] or scenes
    for st in syllabus.get("subtopics", []):
        sid = st.get("id")
        if st.get("must_cover") and sid not in covered and middle:
            middle[len(covered) % len(middle)].setdefault("covers", []).append(sid)
            logger.warning("[%s] coverage gap — attached %s to a scene", AGENT_NAME, sid)
            covered.add(sid)

    plan["scenes"] = scenes
    plan.setdefault("theme", {})
    return plan
