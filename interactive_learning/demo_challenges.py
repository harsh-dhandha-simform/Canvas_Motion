"""Canonical demo challenges, one per type, sourced verbatim from the
schemas/*/challenge_schema.json + ground_truth_schema.json examples.

Shared by claude_api.py (seeds the server-side session store so ground
truth never leaves the server) and generate_visualizer_data.py (bakes the
challenge-only, ground-truth-free JSON the browser is allowed to see), so
the two always agree on challenge_id and content.
"""

DEMO_CHALLENGES = [
    (
        {
            "challenge_id": "arr_001",
            "challenge_type": "arrange_steps",
            "title": "Neural Network Training",
            "description": "Arrange the steps correctly",
            "difficulty": "easy",
            "learning_objective": "Understand training flow",
            "data": {
                "steps": [
                    {"id": "s1", "label": "Forward Pass"},
                    {"id": "s2", "label": "Compute Loss"},
                    {"id": "s3", "label": "Backpropagation"},
                    {"id": "s4", "label": "Update Weights"},
                ]
            },
        },
        {"challenge_id": "arr_001", "correct_order": ["s1", "s2", "s3", "s4"]},
    ),
    (
        {
            "challenge_id": "build_001",
            "challenge_type": "build_it_yourself",
            "title": "Build Web Architecture",
            "description": "Connect components",
            "difficulty": "medium",
            "learning_objective": "Understand architecture flow",
            "data": {
                "components": [
                    {"id": "frontend", "label": "Frontend"},
                    {"id": "backend", "label": "Backend"},
                    {"id": "database", "label": "Database"},
                ]
            },
        },
        {
            "challenge_id": "build_001",
            "correct_connections": [["frontend", "backend"], ["backend", "database"]],
        },
    ),
    (
        {
            "challenge_id": "scenario_001",
            "challenge_type": "scenario_based",
            "title": "Choose Best Model",
            "description": "Select best option",
            "difficulty": "medium",
            "learning_objective": "Model selection",
            "data": {
                "scenario": "500 images with limited GPU and high accuracy needed",
                "options": [
                    {"id": "op1", "label": "CNN"},
                    {"id": "op2", "label": "Transformer"},
                    {"id": "op3", "label": "Logistic Regression"},
                ],
            },
        },
        {"challenge_id": "scenario_001", "correct_option": "op1"},
    ),
    (
        {
            "challenge_id": "mcq_001",
            "challenge_type": "multiple_choice",
            "title": "Neural Networks",
            "description": "Choose the correct answer",
            "difficulty": "easy",
            "learning_objective": "Concept understanding",
            "data": {
                "question": "Which function calculates error?",
                "options": [
                    {"id": "a", "label": "Loss Function"},
                    {"id": "b", "label": "Optimizer"},
                    {"id": "c", "label": "Activation Function"},
                ],
            },
        },
        {"challenge_id": "mcq_001", "correct_option": "a"},
    ),
    (
        {
            "challenge_id": "match_001",
            "challenge_type": "match_items",
            "title": "Match Terms",
            "description": "Connect related items",
            "difficulty": "easy",
            "learning_objective": "Concept association",
            "data": {
                "left": [{"id": "l1", "label": "CNN"}, {"id": "l2", "label": "RNN"}],
                "right": [{"id": "r1", "label": "Images"}, {"id": "r2", "label": "Sequential Data"}],
            },
        },
        {"challenge_id": "match_001", "correct_matches": [["l1", "r1"], ["l2", "r2"]]},
    ),
]
