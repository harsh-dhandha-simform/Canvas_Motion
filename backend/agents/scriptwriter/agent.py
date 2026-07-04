"""
backend/agents/scriptwriter.py — Agent: Scriptwriter (content)

Fills the data for every CONTENT panel — components with dataOwner="content"
(text, lists, code, math, quotes). Does NOT touch visual/diagram panels; those
belong to the Visual Architect and run in parallel.

Also writes the per-scene NARRATION — the spoken/on-screen explanation that
teaches the scene's subtopics. Narration is carried into the final JSON and
shown on screen as a textual explanation.
"""

import json
import logging

from component_catalog import data_owner, get_schema
from utils.api import chat_completion, parse_json_robust
from .schema import ScriptOutput

logger = logging.getLogger(__name__)
AGENT_NAME = "Scriptwriter"

CONTENT_RULES = """
## CONTENT QUALITY RULES (teach, don't list)

AnimatedTitle   {title (5-7 words, has stakes), subtitle (evocative tagline)}
BulletList      {title, items: 5-7 strings} — each "specific claim — concrete detail/number". ≥2 with a real system or number.
NumberedList    {title, items:[{heading, description}]} — ranked/ordered, 3-6 items.
StepFlow        {title, steps: 4-6} — every step starts with an action verb, ≤10 words.
ComparisonCard  {title, pros:4-5, cons:4-5} — real trade-offs about the SAME subject, not marketing.
TwoColumnLayout {title, left:{heading,points:4-5}, right:{heading,points:4-5}} — parallel structure.
CodeBlock       {title, code (10-18 lines of REAL production code, \\n newlines), language}
TerminalCLI     {command, output:[lines]} — a real command + realistic streamed output.
HttpExchange    {method, path, requestHeaders, responseBody, statusCode...} — a real HTTP exchange.
QuoteCard       {quote (verbatim, real), author, role} — never fabricate quotes.
CalloutAnnotation {title, body (1-3 sentences explaining the key insight), bullets?}
GlossaryCards   {title, terms:[{term, definition}]} 4-9 terms.
MathFormula / EquationDerivation — token-based; keep it to one clear equation / a few steps.

Every number you state must be defensible (a real benchmark or spec). No placeholders, no empty arrays.
""".strip()

NARRATION_RULES = """
## NARRATION (one per scene — this is shown on screen as the explanation)

2-4 sentences that actually TEACH the scene's subtopic(s):
  1. the problem / why it exists, 2. how the mechanism works at implementation level,
  3. a real system that uses it, 4. the trade-off or failure mode.
Be concrete and specific — name real systems and real numbers. No filler.
""".strip()


def _content_panels(scenes: list[dict]) -> list[tuple[int, str, str]]:
    out = []
    for sc in scenes:
        for p in sc.get("panels", []):
            if data_owner(p.get("type", "")) == "content":
                out.append((sc.get("index"), p.get("area"), p.get("type")))
    return out


def _schema_reference(types: set[str]) -> str:
    blocks = []
    for t in sorted(types):
        schema = get_schema(t)
        if schema:
            props = schema.get("properties", {})
            required = schema.get("required", [])
            blocks.append(f"### {t}  (required: {', '.join(required) or 'none'})\n{json.dumps(props)[:1000]}")
    return "\n\n".join(blocks)


SYSTEM_PROMPT = f"""
You are a Principal Engineer and technical educator. You write the words and content that fill the
text/code panels of an educational video, and the spoken narration for each scene. You care about
genuine understanding — a senior engineer should learn something they did not already know.

Output ONLY a single JSON object — no prose, no markdown fences.

{CONTENT_RULES}

{NARRATION_RULES}


Fill data ONLY for the content panel areas given to you. Match each component's schema exactly.
Write narration for EVERY scene (including the intro/outro title scenes). Return ONLY valid JSON.
""".strip()


def run_agent(plan: dict, syllabus: dict) -> dict:
    scenes = plan.get("scenes", [])
    content = _content_panels(scenes)
    types = {t for _, _, t in content}

    # subtopic lookup for teaching goals
    by_id = {st.get("id"): st for st in syllabus.get("subtopics", [])}

    scene_lines = []
    for sc in scenes:
        cpanels = [(p.get("area"), p.get("type")) for p in sc.get("panels", [])
                   if data_owner(p.get("type", "")) == "content"]
        goals = "; ".join(
            f"{by_id[sid].get('title')}: {by_id[sid].get('teaching_goal','')}"
            for sid in sc.get("covers", []) if sid in by_id
        )
        cp = "; ".join(f"{a}={t}" for a, t in cpanels) or "(none — narration only)"
        scene_lines.append(
            f"  Scene {sc.get('index')} [{sc.get('title')}] — {sc.get('subtitle','')}\n"
            f"      teaches: {goals or '(intro/outro)'}\n"
            f"      content panels: {cp}"
        )

    user_message = (
        f"Topic: {syllabus.get('topic')}  (depth: {syllabus.get('depth_level')})\n\n"
        f"Scenes (fill data only for the content panels; write narration for all):\n"
        + "\n".join(scene_lines)
        + "\n\nContent component schemas you must satisfy:\n"
        + (_schema_reference(types) or "(no content components)")
        + "\n\nReturn only JSON."
    )

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        agent_name=AGENT_NAME,
        response_model=ScriptOutput,
    )

    raw_dict: dict = parse_json_robust(raw, label=AGENT_NAME)
    script = ScriptOutput.model_validate(raw_dict)

    logger.info("[%s] ✅ Script generated for %d scenes (%d content panels)",
                AGENT_NAME, len(script.scenes), len(content))
    return script.model_dump()
