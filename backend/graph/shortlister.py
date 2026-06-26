"""
backend/graph/shortlister.py — pre-Director candidate selection.

For each subtopic in the syllabus, score every catalog component by lexical /
tag affinity and return the top-N candidates. The Director then picks only from
these shortlists instead of seeing the full catalog — so prompt size stays flat
as the catalog grows from 28 → 100 → 500 components.

Pure Python, deterministic, no LLM. Lives behind `shortlist(query)` so it can be
swapped for embedding retrieval later without touching any agent.
"""

import logging
import re
from collections import Counter

from component_catalog import get_catalog

logger = logging.getLogger(__name__)

_WORD = re.compile(r"[a-z0-9]+")

# Components that should always be available to the Director regardless of score,
# so it can always reach for a title or an on-screen textual explanation.
_ALWAYS_INCLUDE = ["AnimatedTitle", "TypewriterText", "BulletList", "CalloutAnnotation"]

# Very common english/topic words that carry no selection signal.
_STOP = frozenset("""
the a an and or of to in for with on at is are be this that these those it its as by from into
how why what when which use used using video scene topic explain explanation understand
""".split())


def _tokens(text: str) -> list[str]:
    return [w for w in _WORD.findall((text or "").lower()) if w not in _STOP and len(w) > 1]


def _component_index() -> dict[str, Counter]:
    """Pre-tokenized weighted bag-of-words per component (tags weigh most)."""
    index: dict[str, Counter] = {}
    for name, info in get_catalog().items():
        bag: Counter = Counter()
        for tag in info.get("tags", []):
            bag[tag.lower()] += 3                      # tags: strongest signal
        for w in _tokens(info.get("useWhen", "")):
            bag[w] += 2                                # useWhen: curated cue
        for w in _tokens(info.get("description", "")):
            bag[w] += 1
        bag[info.get("category", "").lower()] += 1
        index[name] = bag
    return index


def shortlist(query: str, top_n: int = 12) -> list[str]:
    """Return up to top_n component names most relevant to the query text."""
    index = _component_index()
    q = _tokens(query)
    if not q:
        return list(index.keys())[:top_n]

    scored: list[tuple[float, str]] = []
    for name, bag in index.items():
        score = sum(bag.get(w, 0) for w in q)
        # small boost for multi-word tag phrase hits ("time-series", "b-tree")
        for tag in get_catalog()[name].get("tags", []):
            if "-" in tag and tag.lower() in query.lower():
                score += 2
        scored.append((score, name))

    scored.sort(key=lambda s: (-s[0], s[1]))
    ranked = [name for score, name in scored if score > 0][:top_n]
    return ranked or list(index.keys())[:top_n]


def _subtopic_query(st: dict) -> str:
    parts = [
        st.get("title", ""),
        st.get("teaching_goal", ""),
        st.get("depth_notes", ""),
        " ".join(st.get("real_systems", []) or []),
    ]
    return " ".join(parts)


def build_shortlists(syllabus: dict, top_n: int = 12) -> dict[str, list[str]]:
    """Map each subtopic id → ranked candidate component names (+ always-include staples)."""
    shortlists: dict[str, list[str]] = {}
    for st in syllabus.get("subtopics", []):
        sid = st.get("id")
        ranked = shortlist(_subtopic_query(st), top_n=top_n)
        # ensure the always-include staples are present without displacing top hits
        for staple in _ALWAYS_INCLUDE:
            if staple not in ranked:
                ranked.append(staple)
        shortlists[sid] = ranked
        logger.info("[Shortlister] %s → %s", sid, ranked[:top_n])
    return shortlists
