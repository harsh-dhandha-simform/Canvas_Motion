"""Plain-script integration test (run: uv run python tests/test_agents_chain.py).
Exercises researcher -> director -> {scriptwriter, visual_architect} against the
real LLM proxy. Requires LLM_BASE_URL/KEY."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.engine.agents.director import agent as director
from app.engine.agents.researcher import agent as researcher
from app.engine.agents.scriptwriter import agent as scriptwriter
from app.engine.agents.visual_architect import agent as visual_architect
from app.engine.catalog import data_owner

_VALID_LAYOUTS = {"full", "left-right", "title-content", "title-left-right", "title-main-sidebar"}


def main() -> None:
    syl = researcher.run_agent("Bloom filters", 90)
    assert syl.get("subtopics"), "researcher produced no subtopics"
    print(f"researcher: {len(syl['subtopics'])} subtopics")

    plan = director.run_agent(syl, 90)
    scenes = plan.get("scenes", [])
    assert scenes, "director produced no scenes"
    for sc in scenes:
        assert sc.get("panels"), f"scene {sc.get('index')} has no panels"
        assert sc["layout"] in _VALID_LAYOUTS, f"bad layout {sc['layout']}"
    print(f"director: {len(scenes)} scenes, layouts OK")

    script = scriptwriter.run_agent(plan, syl)
    story = visual_architect.run_agent(plan, syl)
    assert script.get("scenes"), "scriptwriter produced no scenes"
    assert story.get("scenes"), "visual_architect produced no scenes"

    # Every content panel area should be filled by scriptwriter; visual by visual_architect.
    for i, sc in enumerate(scenes):
        content_areas = [p["area"] for p in sc["panels"] if data_owner(p["type"]) == "content"]
        visual_areas = [p["area"] for p in sc["panels"] if data_owner(p["type"]) == "visual"]
        s_panels = script["scenes"][i].get("panels", {}) if i < len(script["scenes"]) else {}
        v_panels = story["scenes"][i].get("panels", {}) if i < len(story["scenes"]) else {}
        for a in content_areas:
            assert a in s_panels, f"scene {i}: scriptwriter missing content area '{a}'"
        for a in visual_areas:
            assert a in v_panels, f"scene {i}: visual_architect missing visual area '{a}'"
    print("scriptwriter + visual_architect: all panel areas covered")
    print("test_agents_chain: PASS")


if __name__ == "__main__":
    main()
