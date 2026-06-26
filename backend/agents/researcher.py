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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT SCHEMA

{
  "topic": "<topic string, cleaned up>",
  "one_line": "<one-sentence definition a senior engineer would accept>",
  "depth_level": "introductory" | "intermediate" | "advanced",
  "prerequisites": ["<concept that must be understood first>", ...],   // 0-4 items
  "subtopics": [
    {
      "id": "st1",                                  // st1, st2, ... unique
      "title": "<short noun phrase>",
      "teaching_goal": "<what the viewer should understand after this — 1 sentence>",
      "depth_notes": "<the specific mechanism / number / trade-off that makes this non-obvious>",
      "real_systems": ["<real system that exemplifies this>", ...],   // 0-3
      "must_cover": true | false                    // true = video is incomplete without it
    }
    // ...
  ],
  "misconceptions": ["<a common wrong belief this video should correct>", ...],  // 1-4
  "key_terms": ["<term a glossary/lower-third should define>", ...]              // 3-8
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


def run_agent(topic: str, duration_seconds: int = 60) -> dict:
    logger.info("[%s] Building syllabus for %r (%ds)", AGENT_NAME, topic, duration_seconds)

    raw = chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Topic: {topic}\n"
                f"Target video length: {duration_seconds} seconds.\n\n"
                "Design the complete teaching syllabus. Be exhaustive about what a senior engineer "
                "needs in order to truly understand this — leave no important sub-topic uncovered. "
                "Return only JSON."
            )},
        ],
        temperature=0.6,
        agent_name=AGENT_NAME,
    )

    syllabus: dict = parse_json_robust(raw, label=AGENT_NAME)

    # Normalize: guarantee unique ids and a non-empty subtopic list
    subtopics = syllabus.get("subtopics") or []
    for i, st in enumerate(subtopics):
        st.setdefault("id", f"st{i + 1}")
        st.setdefault("must_cover", True)
        st.setdefault("title", f"Subtopic {i + 1}")
    syllabus["subtopics"] = subtopics
    syllabus.setdefault("topic", topic)
    syllabus.setdefault("depth_level", "intermediate")
    syllabus.setdefault("prerequisites", [])
    syllabus.setdefault("misconceptions", [])
    syllabus.setdefault("key_terms", [])

    must = sum(1 for s in subtopics if s.get("must_cover"))
    logger.info(
        "[%s] ✅ Syllabus: %d subtopics (%d must-cover), depth=%s",
        AGENT_NAME, len(subtopics), must, syllabus.get("depth_level"),
    )
    return syllabus
