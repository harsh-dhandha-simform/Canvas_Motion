"""Per-type coverage for generation.py, using real LLM outputs captured
during the Phase 1 exercise run (mocked, no live calls) so this doesn't cost
a 13-120s round trip per test.
"""

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from interactive_learning import generation

# Verbatim payloads the LLM actually returned during the Phase 1 run.
REAL_PAYLOADS = {
    "arrange_steps": {
        "title": "The HTTP Request Lifecycle",
        "description": "Arrange the steps that occur when a browser loads a web page.",
        "difficulty": "medium",
        "learning_objective": "Understand the sequence of network and browser events.",
        "steps": [
            {"id": "s1", "label": "Browser performs a DNS lookup"},
            {"id": "s2", "label": "Browser establishes a TCP connection"},
            {"id": "s3", "label": "Browser sends an HTTP request"},
            {"id": "s4", "label": "Server processes the request"},
            {"id": "s5", "label": "Browser receives the HTTP response"},
            {"id": "s6", "label": "Browser renders the page"},
        ],
        "correct_order": ["s1", "s2", "s3", "s4", "s5", "s6"],
    },
    "build_it_yourself": {
        "title": "Build a Web Application Architecture",
        "description": "Connect the core building blocks of a modern web application.",
        "difficulty": "easy",
        "learning_objective": "Identify core components and request flow.",
        "components": [
            {"id": "c1", "label": "Frontend Client"},
            {"id": "c2", "label": "Backend API Server"},
            {"id": "c3", "label": "Database"},
            {"id": "c4", "label": "Cache Layer"},
            {"id": "c5", "label": "Load Balancer"},
        ],
        "correct_connections": [
            ["c1", "c5"], ["c5", "c2"], ["c2", "c4"], ["c4", "c3"], ["c2", "c3"],
        ],
    },
    "scenario_based": {
        "title": "Deploying an Image Classifier on a Single 4GB GPU",
        "description": "Pick the best model architecture for a constrained task.",
        "difficulty": "medium",
        "learning_objective": "Balance accuracy, size, and inference speed.",
        "scenario": "Your team needs to deploy an image classifier with only 4GB VRAM.",
        "options": [
            {"id": "op1", "label": "ResNet-152 fp32"},
            {"id": "op2", "label": "MobileNetV3 quantized"},
            {"id": "op3", "label": "ViT-Large from scratch"},
            {"id": "op4", "label": "Ensemble of 5 CNNs"},
        ],
        "correct_option": "op2",
    },
    "multiple_choice": {
        "title": "Spotting Overfitting",
        "description": "Test your understanding of overfitting.",
        "difficulty": "easy",
        "learning_objective": "Identify the correct definition of overfitting.",
        "question": "A model gets 99% training accuracy but 60% test accuracy. This is a sign of?",
        "options": [
            {"id": "a", "label": "Underfitting"},
            {"id": "b", "label": "Overfitting"},
            {"id": "c", "label": "Good generalization"},
            {"id": "d", "label": "Unrelated data leakage"},
        ],
        "correct_option": "b",
    },
    "match_items": {
        "title": "Match the Architecture to Its Use Case",
        "description": "Pair each architecture with its best-suited task.",
        "difficulty": "medium",
        "learning_objective": "Associate architectures with appropriate tasks.",
        "left": [
            {"id": "l1", "label": "CNN"},
            {"id": "l2", "label": "RNN"},
            {"id": "l3", "label": "Transformer"},
            {"id": "l4", "label": "GAN"},
        ],
        "right": [
            {"id": "r1", "label": "Image classification"},
            {"id": "r2", "label": "Sequential data"},
            {"id": "r3", "label": "Long-range language"},
            {"id": "r4", "label": "Synthetic images"},
        ],
        "correct_matches": [["l1", "r1"], ["l2", "r2"], ["l3", "r3"], ["l4", "r4"]],
    },
}


class GenerationPerTypeTest(unittest.TestCase):
    def test_all_five_types_parse_and_validate(self):
        for challenge_type, payload in REAL_PAYLOADS.items():
            with self.subTest(challenge_type=challenge_type):
                with patch(
                    "interactive_learning.generation.llm_client.ask",
                    return_value=json.dumps(payload),
                ):
                    challenge, ground_truth = generation.generate_challenge(
                        "topic", "summary", challenge_type
                    )

                self.assertEqual(challenge["challenge_type"], challenge_type)
                self.assertTrue(challenge["challenge_id"].startswith(challenge_type))
                self.assertEqual(ground_truth["challenge_id"], challenge["challenge_id"])

    def test_arrange_steps_rejects_out_of_limit_step_count(self):
        payload = dict(REAL_PAYLOADS["arrange_steps"])
        payload["steps"] = [{"id": "s1", "label": "only one step"}]
        payload["correct_order"] = ["s1"]

        with patch(
            "interactive_learning.generation.llm_client.ask",
            return_value=json.dumps(payload),
        ):
            with self.assertRaises(generation.GenerationError):
                generation.generate_challenge("topic", "summary", "arrange_steps")

    def test_build_it_yourself_rejects_connection_to_unknown_component(self):
        payload = dict(REAL_PAYLOADS["build_it_yourself"])
        payload["correct_connections"] = [["c1", "does_not_exist"]]

        with patch(
            "interactive_learning.generation.llm_client.ask",
            return_value=json.dumps(payload),
        ):
            with self.assertRaises(generation.GenerationError):
                generation.generate_challenge("topic", "summary", "build_it_yourself")


if __name__ == "__main__":
    unittest.main()
