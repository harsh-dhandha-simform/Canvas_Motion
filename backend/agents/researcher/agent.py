"""
backend/agents/researcher.py — Agent 0: Researcher / Curriculum Planner

Runs BEFORE everything else. Decomposes the topic into a teaching syllabus so the
rest of the pipeline can guarantee the topic is explained in depth, with every
required sub-topic covered.

Output (the "syllabus") drives the whole pipeline:
  - subtopics[]  → become the scene intents the Shortlister + Director key off
  - prerequisites → ensure nothing is hand-waved (explained before the main idea)
  - depth_level  → how advanced the content should be
  - the Validator later checks that EVERY must-cover subtopic maps to a scene
"""

import logging

from utils.api import chat_completion, parse_json_robust
from .schema import Syllabus

logger = logging.getLogger(__name__)
AGENT_NAME = "Researcher"

SYSTEM_PROMPT = """
You are a curriculum designer and subject-matter expert. Given a single topic, your job is to
produce the COMPLETE teaching syllabus for an in-depth educational video aimed at senior engineers —
so that, after watching, the viewer genuinely understands the topic with nothing important left out.

Think like you are designing a university lecture: what must be explained, in what order, and what
would a smart viewer STILL not understand if you skipped it. Every gap you would leave becomes a
subtopic. Be thorough — surface the prerequisites, the core mechanism, the trade-offs, the failure
modes, and how it works in real systems.

Output ONLY a single JSON object — no prose, no markdown fences.


## RULES FOR DEPTH & COMPLETENESS

1. Produce 5-9 subtopics. They must form a coherent arc: hook → prerequisites → core mechanism →
   deep dive(s) → trade-offs/failure modes → synthesis/when-to-use.
2. At least 4 subtopics MUST be must_cover=true. Mark a subtopic must_cover=false only if it is
   genuinely optional enrichment.
3. depth_notes is mandatory and must contain something concrete — a real mechanism, a benchmark
   number, an algorithmic detail, or a named trade-off. Never vague ("it is fast", "it is useful").
4. Order subtopics so each builds on the previous. Prerequisites come before the concept that needs them.
5. real_systems must be REAL and accurate (Kafka, Raft, DynamoDB, etcd, PostgreSQL, Kubernetes, ...).
6. Do NOT mention components, layouts, scenes, or visuals — that is a later agent's job. You design
   WHAT must be taught, not how it is shown.

Return ONLY valid JSON.
""".strip()


def run_agent(topic: str, duration_seconds: int = 60, context: str | None = None) -> dict:
    logger.info("[%s] Building syllabus for %r (%ds)", AGENT_NAME, topic, duration_seconds)

    context_block = (
        f"Author's framing / angle to honor (shape the syllabus around this):\n{context.strip()}\n\n"
        if context and context.strip() else ""
    )
    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Topic: {topic}\n"
                f"Target video length: {duration_seconds} seconds.\n\n"
                f"{context_block}"
                "Design the complete teaching syllabus. Be exhaustive about what a senior engineer "
                "needs in order to truly understand this — leave no important sub-topic uncovered. "
                "Return only JSON."
            )},
        ],
        temperature=0.6,
        agent_name=AGENT_NAME,
        response_model=Syllabus,
    )

    raw_dict: dict = parse_json_robust(raw, label=AGENT_NAME)

    # Normalize: guarantee unique ids and a non-empty subtopic list
    subtopics = raw_dict.get("subtopics") or []
    for i, st in enumerate(subtopics):
        st.setdefault("id", f"st{i + 1}")
        st.setdefault("must_cover", True)
        st.setdefault("title", f"Subtopic {i + 1}")
    raw_dict["subtopics"] = subtopics
    raw_dict.setdefault("topic", topic)
    raw_dict.setdefault("depth_level", "intermediate")
    raw_dict.setdefault("prerequisites", [])
    raw_dict.setdefault("misconceptions", [])
    raw_dict.setdefault("key_terms", [])

    syllabus = Syllabus.model_validate(raw_dict)

    must = sum(1 for s in syllabus.subtopics if s.must_cover)
    logger.info(
        "[%s] ✅ Syllabus: %d subtopics (%d must-cover), depth=%s",
        AGENT_NAME, len(syllabus.subtopics), must, syllabus.depth_level,
    )
    return syllabus.model_dump()
