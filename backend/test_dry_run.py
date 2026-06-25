import json
import sys
from unittest.mock import patch

# Mock responses for each agent
MOCK_DIRECTOR = json.dumps(
    {
        "topic": "Horizontal vs Vertical Scaling",
        "target_audience": "senior engineers",
        "depth_level": "intermediate",
        "tone": "technical",
        "palette": {
            "background": "#0a0e1a",
            "primary": "#7c3aed",
            "secondary": "#f59e0b",
            "text": "#ffffff",
            "muted": "#94a3b8",
            "code_bg": "#1e293b",
            "highlight": "#34d399",
            "success": "#10b981",
            "danger": "#ef4444",
        },
        "typography": {
            "heading_font": "Inter",
            "body_font": "Inter",
            "code_font": "Fira Code",
        },
        "total_seconds": 60,
        "scene_count": 4,
        "scene_titles": [
            "Intro",
            "Vertical Scaling",
            "Horizontal Scaling",
            "Conclusion",
        ],
        "key_concepts": ["Scaling", "Scale-up", "Scale-out"],
        "visual_metaphors": ["Servers getting bigger vs more servers"],
        "technical_depth": {
            "cover_internals": True,
            "show_trade_offs": True,
            "include_failure_modes": True,
            "show_real_world_examples": True,
        },
    }
)

MOCK_SCRIPTWRITER = json.dumps(
    {
        "scenes": [
            {
                "scene_index": 1,
                "title": "Intro",
                "narration": "Let's explore scaling.",
                "key_points": ["Scaling", "Capacity"],
                "technical_terms": ["Scale"],
                "code_snippet": None,
            },
            {
                "scene_index": 2,
                "title": "Vertical Scaling",
                "narration": "Vertical scaling is scale up.",
                "key_points": ["Bigger CPU", "More RAM"],
                "technical_terms": ["Scale-up"],
                "code_snippet": None,
            },
            {
                "scene_index": 3,
                "title": "Horizontal Scaling",
                "narration": "Horizontal scaling is scale out.",
                "key_points": ["More servers", "Load balancer"],
                "technical_terms": ["Scale-out"],
                "code_snippet": None,
            },
            {
                "scene_index": 4,
                "title": "Conclusion",
                "narration": "That is the difference.",
                "key_points": ["Trade-offs"],
                "technical_terms": [],
                "code_snippet": None,
            },
        ]
    }
)

MOCK_STORYBOARD = json.dumps(
    {
        "scenes": [
            {"scene_index": 1, "layout_type": "title", "visual_elements": []},
            {"scene_index": 2, "layout_type": "comparison", "visual_elements": []},
            {"scene_index": 3, "layout_type": "comparison", "visual_elements": []},
            {"scene_index": 4, "layout_type": "title", "visual_elements": []},
        ]
    }
)

MOCK_SYNC = json.dumps(
    {
        "scenes": [
            {"scene_index": 1, "duration_frames": 450},
            {"scene_index": 2, "duration_frames": 450},
            {"scene_index": 3, "duration_frames": 450},
            {"scene_index": 4, "duration_frames": 450},
        ]
    }
)

MOCK_ASSEMBLER = json.dumps(
    {
        "title": "Horizontal vs Vertical Scaling",
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "theme": {
            "primary": "#7c3aed",
            "secondary": "#f59e0b",
            "accent": "#34d399",
            "background": "#0b0f1e",
            "font": "Inter",
        },
        "scenes": [
            {
                "id": "scene-1",
                "type": "AnimatedTitle",
                "duration_frames": 450,
                "transition": "none",
                "data": {"title": "Scaling", "align": "center"},
            },
            {
                "id": "scene-2",
                "type": "ComparisonCard",
                "duration_frames": 450,
                "transition": "none",
                "data": {"title": "Vertical", "pros": ["Easy"], "cons": ["Downtime"]},
            },
            {
                "id": "scene-3",
                "type": "ComparisonCard",
                "duration_frames": 450,
                "transition": "none",
                "data": {
                    "title": "Horizontal",
                    "pros": ["Resilient"],
                    "cons": ["Complex"],
                },
            },
            {
                "id": "scene-4",
                "type": "AnimatedTitle",
                "duration_frames": 450,
                "transition": "none",
                "data": {"title": "Conclusion", "align": "center"},
            },
        ],
    }
)


def mock_chat_completion(messages, **kwargs):
    agent_name = kwargs.get("agent_name", "")
    if agent_name == "Director":
        return MOCK_DIRECTOR
    elif agent_name == "Scriptwriter":
        return MOCK_SCRIPTWRITER
    elif agent_name == "Storyboard":
        return MOCK_STORYBOARD
    elif agent_name == "Sync":
        return MOCK_SYNC
    return "{}"


def mock_call_llm(prompt, system_prompt):
    return (MOCK_ASSEMBLER, "mock-model", False)


@patch("utils.api.chat_completion", side_effect=mock_chat_completion)
@patch("utils.api.call_llm", side_effect=mock_call_llm)
def test_pipeline(mock_call, mock_chat):
    from server import generate_script, GenerateScriptRequest

    print("Testing pipeline with mocked LLM calls...")

    req = GenerateScriptRequest(
        topic="Horizontal vs Vertical Scaling", duration_seconds=60, style="educational"
    )
    res = generate_script(req)
    print("Pipeline executed successfully!")
    print("Output VideoScript:")
    print(json.dumps(res.script, indent=2))


if __name__ == "__main__":
    test_pipeline()
