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

from app.engine.catalog import data_owner, get_schema
from app.engine.llm import chat_completion, parse_json_robust
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

EVERY single scene MUST have narration. This is critical. 
The audio for the entire video comes directly from the combined narration. 
If a scene has empty narration, there will be dead silence during that scene.

1. Scene 0 (Hook): 2-3 sentences introducing the topic and why it matters.
2. Middle Scenes: 3-5 sentences that actually TEACH the scene's subtopic(s):
   - the problem / why it exists
   - how the mechanism works at implementation level
   - a real system that uses it
   - the trade-off or failure mode
3. Last Scene (Outro): 2-3 sentences summarizing the key takeaways.

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

## OUTPUT FORMAT
Return a JSON object with this EXACT structure (N scenes in order, 0-indexed):
{{
  "scenes": [
    {{
      "narration": "...",
      "panels": {{
        "<area_name>": {{ <component data matching schema> }},
        "<area_name2>": {{ <component data matching schema> }}
      }}
    }},
    ...
  ]
}}

CRITICAL: The "panels" object MUST contain an entry for EVERY content panel area listed for that scene.
If a scene has no content panels (e.g. intro/outro with only an AnimatedTitle), include that
AnimatedTitle data in panels too since AnimatedTitle is content-owned.
Do NOT output "panels": {{}} for any scene that has content panels.
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
        if cpanels:
            cp = "; ".join(f'"{a}" → {t}' for a, t in cpanels)
        else:
            cp = "(none — narration only)"
        scene_lines.append(
            f"  Scene {sc.get('index')} [{sc.get('title')}] — {sc.get('subtitle','')}\n"
            f"      teaches: {goals or '(intro/outro)'}\n"
            f"      FILL THESE content panel areas: {cp}"
        )

    user_message = (
        f"Topic: {syllabus.get('topic')}  (depth: {syllabus.get('depth_level')})\n\n"
        f"Produce exactly {len(scenes)} scenes in order. For each scene, write narration AND fill ALL listed content panel areas:\n"
        + "\n".join(scene_lines)
        + "\n\nContent component schemas you must satisfy:\n"
        + (_schema_reference(types) or "(no content components)")
        + "\n\nReturn only JSON. The 'scenes' array MUST have exactly "
        + f"{len(scenes)} elements."
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

    # Validate that content panels are actually filled
    expected_content = {}
    for sc in scenes:
        idx = sc.get("index", 0)
        expected_content[idx] = [(p.get("area"), p.get("type")) for p in sc.get("panels", [])
                                  if data_owner(p.get("type", "")) == "content"]

    empty_scenes = []
    for i, scene in enumerate(script.scenes):
        idx = scenes[i].get("index", i) if i < len(scenes) else i
        expected = expected_content.get(idx, [])
        if expected and not scene.panels:
            empty_scenes.append(i)
            logger.warning(
                "[%s] Scene %d has %d expected content panels but returned empty panels dict! "
                "Expected: %s",
                AGENT_NAME, i, len(expected), expected
            )

    if empty_scenes:
        logger.warning(
            "[%s] ⚠️ %d/%d scenes have missing panel data. "
            "This will cause empty components in the final video.",
            AGENT_NAME, len(empty_scenes), len(script.scenes)
        )

    logger.info("[%s] ✅ Script generated for %d scenes (%d content panels)",
                AGENT_NAME, len(script.scenes), len(content))
    return script.model_dump()
