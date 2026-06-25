import json
import logging
from typing import Any
from graph.state import PipelineState
from graph.tools import get_component_catalog, get_remotion_skill
from agents import director, scriptwriter, storyboard, sync
from utils.api import call_llm
from utils.topic_classifier import (
    detect_arc_type,
    is_comparison_topic,
    recommend_component_for_scene,
    COMPARISON_SCENE_SEQUENCE,
)

logger = logging.getLogger(__name__)


def director_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running director node")
    brief = director.run_agent(state["topic"])

    # Override arc_type with our deterministic classifier (faster + more reliable than LLM guess)
    arc_type = detect_arc_type(state["topic"])
    brief["arc_type"] = arc_type

    # For diagram-driven topics, clamp scene_count to 5–7
    if arc_type == "diagram-driven":
        scene_count = brief.get("scene_count", 6)
        brief["scene_count"] = max(5, min(7, scene_count))
        # Also align scene_titles length
        titles = brief.get("scene_titles", [])
        target_count = brief["scene_count"]
        if len(titles) > target_count:
            brief["scene_titles"] = titles[:target_count]

    logger.info("[director_node] arc_type=%s scene_count=%s", arc_type, brief.get("scene_count"))
    return {"brief": brief}


def scriptwriter_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running scriptwriter node")
    script = scriptwriter.run_agent(state["brief"])
    return {"script": script}


def storyboard_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running storyboard node")
    story = storyboard.run_agent(state["brief"], state["script"])
    return {"story": story}


def sync_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running sync node")
    timing = sync.run_agent(state["brief"], state["script"])
    return {"timing": timing}


def assembler_node(state: PipelineState) -> dict[str, Any]:
    logger.info("Running assembler node")
    brief = state["brief"]
    script = state["script"]
    story = state.get("story") or {}
    timing = state["timing"]
    topic = state["topic"]

    catalog_json = get_component_catalog.invoke({})
    remotion_knowledge = get_remotion_skill.invoke({"topic": topic})

    palette = brief.get("palette", {})
    typo = brief.get("typography", {})
    arc_type = brief.get("arc_type", detect_arc_type(topic))
    is_comparison = is_comparison_topic(topic)

    # Build per-scene storyboard component hints
    story_by_index: dict[int, dict] = {
        s.get("scene_index", i): s
        for i, s in enumerate(story.get("scenes", []))
    }

    # Build scene rows with storyboard hints injected
    scene_rows: list[str] = []
    for i, (s_script, s_timing) in enumerate(
        zip(script.get("scenes", []), timing.get("scenes", []))
    ):
        story_scene = story_by_index.get(i, story_by_index.get(s_script.get("scene_index", i), {}))
        rec_components = recommend_component_for_scene(story_scene)
        visual_concept = story_scene.get("visual_concept", "")
        enter_transition = story_scene.get("transitions", {}).get("enter", "fade")

        # Map storyboard transition to our transition vocabulary
        transition_map = {
            "wipe-right": "slideLeft",
            "slide-up": "slideUp",
            "zoom-in": "zoom",
            "fade": "fade",
            "slide-left": "slideLeft",
        }
        suggested_transition = transition_map.get(enter_transition, "fade")
        # Last scene always gets "none"
        if i == len(script.get("scenes", [])) - 1:
            suggested_transition = "none"

        scene_rows.append(
            f"  [{i+1}] title={s_script.get('title')!r} | "
            f"duration_frames={s_timing.get('duration_frames')} (FIXED, do NOT change) | "
            f"key_points={s_script.get('key_points', [])} | "
            f"visual_concept={visual_concept!r} | "
            f"recommended_components={rec_components} | "
            f"suggested_transition={suggested_transition!r}"
        )

    total_frames = sum(s.get("duration_frames", 0) for s in timing.get("scenes", []))

    # -----------------------------------------------------------------------
    # Build the comparison arc template block (only for X vs Y topics)
    # -----------------------------------------------------------------------
    comparison_block = ""
    if is_comparison and arc_type == "diagram-driven":
        seq = COMPARISON_SCENE_SEQUENCE
        comparison_block = f"""
## DIAGRAM-DRIVEN COMPARISON ARC — MANDATORY SCENE SEQUENCE
This topic is a comparison of two approaches. You MUST use EXACTLY this scene-type sequence:
  Scene 1: {seq[0]}  ← intro title card
  Scene 2: {seq[1]}  ← problem / context (the dilemma, use bullet points + optional code)
  Scene 3: {seq[2]}  ← Approach A topology (nodes[] + connections[] required)
  Scene 4: {seq[3]}  ← Approach B topology (nodes[] + connections[] required)
  Scene 5: {seq[4]}  ← trade-off analysis (pros/cons, 3–5 items per side)
  Scene 6: {seq[5]}  ← takeaway / outro

For ArchitectureDiagram scenes, you MUST populate:
  - nodes[]: at least 3 entries, each with {{ id, type, x, y, label }}
    types: "client" | "server" | "loadBalancer" | "database"
    x/y: percentage 0–100 (relative to 1920×1080 canvas)
  - connections[]: map nodes with {{ fromId, toId, type }}
    type: "stream" | "arrow"
DO NOT use ArchitectureDiagram with empty nodes[].
"""

    assembler_prompt = (
        f"Convert this multi-agent pipeline output to a VideoScript JSON.\n"
        f"Topic: {topic!r}\n"
        f"arc_type: {arc_type!r}\n\n"
        f"SCENE PLAN — duration_frames values are EXACT, copy them unchanged:\n"
        + "\n".join(scene_rows)
        + f"\n\nTheme — use these EXACT hex values:\n"
        f'  background="{palette.get("background", "#0b0f1e")}"  '
        f'primary="{palette.get("primary", "#7c3aed")}"  '
        f'secondary="{palette.get("secondary", "#f59e0b")}"  '
        f'accent="{palette.get("highlight", "#34d399")}"  '
        f'font="{typo.get("heading_font", "Inter")}"\n\n'
        f"Total frames = {total_frames} (sum of all duration_frames must equal this exactly).\n"
        + comparison_block
    )

    system_prompt = f"""You are an expert video assembler.
Available components and their exact JSON schemas:
{catalog_json}

Remotion Knowledge:
{remotion_knowledge}

Your ONLY output is a raw JSON object. No markdown, no backticks, no explanations.
Return a single JSON object with this exact structure:
{{
  "title": "string",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "theme": {{ "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "font": "Inter" }},
  "scenes": [
    {{
      "id": "scene-1",
      "type": "ExactComponentName",
      "duration_frames": 90,
      "transition": "fade | slideLeft | slideUp | zoom | none",
      "data": {{ ... exact props matching the component schema ... }}
    }}
  ]
}}

## COMPONENT SELECTION GUIDE
Pick the component that BEST matches the scene content + storyboard hints:
- AnimatedTitle: title cards, intro/outro, section transitions. NEVER for content scenes with 3+ key_points.
- ComparisonCard: pros/cons, before/after, A vs B. Each side 2–5 items, ≤10 words each.
- ArchitectureDiagram: system topology, servers, load balancers, databases, connections. MUST populate nodes[] + connections[].
- SplitScreen: 3–5 bullets AND/OR a code snippet — left panel text, right panel content.
- BulletList: 3–7 short key points without pros/cons structure.
- StepFlow: sequential stages or steps (first… then… finally).
- StatCallout: a striking number ("10K req/s", "99.99% uptime").
- CodeBlock: code reveal line-by-line.
- TimelineFlow: historical or chronological events.
- QuoteCard: quotes a person, paper, or principle.
- TwoColumnLayout: side-by-side feature comparison with headings and bullet lists.
- BarChart: comparing numeric values across categories.
- TypewriterText: dramatic single-line or multi-line text reveal.

## TRANSITION SELECTION GUIDE
- "fade": calm, neutral — intro and reflective scenes
- "slideLeft": forward motion — between sequential content scenes
- "slideUp": upward energy — after a comparison
- "zoom": emphasis — use sparingly (1–2 per video) for a key reveal
- "none": ONLY for the very last scene

CRITICAL: Use the recommended_components and suggested_transition from each scene row above.
CRITICAL: The "data" field MUST exactly match the component's JSON schema from the catalog.
CRITICAL: Do NOT invent field names. Do NOT leave nodes[] empty for ArchitectureDiagram.
"""

    from utils.api import get_client, extract_json
    from models.video_script import VideoScript
    from pydantic import ValidationError

    # Models that support json_object response_format on Groq
    STRUCTURED_MODELS = [
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "compound-beta",
    ]

    raw_text = None
    model_used = None
    fallback_triggered = False
    client = get_client()

    for i, model in enumerate(STRUCTURED_MODELS):
        if i > 0:
            fallback_triggered = True
        try:
            logger.info("[assembler] Trying structured output with model: %s", model)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": assembler_prompt},
                ],
                temperature=0.3,
                max_tokens=8192,
                response_format={"type": "json_object"},
            )
            raw_text = response.choices[0].message.content or ""
            model_used = model
            logger.info("[assembler] ✅ Got structured response from %s", model)
            break
        except Exception as exc:
            logger.warning("[assembler] ⚠️ Model %s failed: %s", model, exc)
            continue

    if not raw_text:
        logger.warning("[assembler] Falling back to unstructured call_llm")
        try:
            raw_text, model_used, fallback_triggered = call_llm(assembler_prompt, system_prompt)
        except Exception as e:
            logger.error(f"Assembler call_llm fallback failed: {e}")
            return {"errors": [str(e)]}

    # Parse JSON
    try:
        text = extract_json(raw_text)
        raw_dict = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"[assembler] JSON parse failed: {e}\nRaw:\n{raw_text[:500]}")
        return {"errors": [f"JSON parse error: {e}"]}

    # Validate with Pydantic
    try:
        video_script = VideoScript.model_validate(raw_dict)
        validated_dict = video_script.model_dump(mode="json")
        logger.info(
            "[assembler] ✅ Pydantic validation passed — %d scenes, %d total frames",
            len(video_script.scenes),
            video_script.total_frames(),
        )
        return {
            "video_script": validated_dict,
            "model_used": model_used,
            "fallback_triggered": fallback_triggered,
        }
    except ValidationError as e:
        errors = e.errors()
        logger.error("[assembler] ❌ Pydantic validation failed (%d errors):", len(errors))
        for err in errors:
            logger.error("  field=%s  msg=%s", err.get("loc"), err.get("msg"))

        return {
            "video_script": raw_dict,
            "model_used": model_used,
            "fallback_triggered": fallback_triggered,
            "validation_errors": [str(err) for err in errors],
        }
    except Exception as e:
        logger.error(f"[assembler] Unexpected error: {e}")
        return {"errors": [str(e)]}
