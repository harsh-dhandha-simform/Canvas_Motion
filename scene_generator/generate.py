"""Generates one VisualizationSpec JSON per file in modules_summary/, using
SKILL_scene_spec.md as the authoring guide and Azure OpenAI (GPT-4o) as the
generator. Writes output/{module_stem}.json.

Run: uv run -m scene_generator.generate
"""

import json
import sys
from pathlib import Path

from scene_generator import llm_client
from scene_generator.validator import SpecValidationError, validate_spec

REPO_ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = REPO_ROOT / "SKILL_scene_spec.md"
MODULES_DIR = REPO_ROOT / "modules_summary"
OUTPUT_DIR = REPO_ROOT / "output"

USER_PROMPT_TEMPLATE = """Here is the module summary to turn into a VisualizationSpec:

{module_content}

Follow the SKILL exactly. Output ONLY the raw JSON object - no markdown \
code fences, no prose before or after.
"""

RETRY_PROMPT_TEMPLATE = """Here is the module summary to turn into a VisualizationSpec:

{module_content}

You previously produced this JSON, which failed validation against the SKILL:

{previous_json}

Validation errors:
{errors}

Fix ONLY these specific issues while keeping the rest of the spec intact. \
Output ONLY the corrected raw JSON object - no markdown code fences, no prose.
"""

MAX_ATTEMPTS = 2


class GenerationError(RuntimeError):
    pass


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GenerationError(f"Model did not return valid JSON: {exc}\nRaw: {raw!r}") from exc


def generate_spec_for_module(spec_guide: str, module_content: str) -> dict:
    raw = llm_client.ask_json(
        system_prompt=spec_guide,
        user_prompt=USER_PROMPT_TEMPLATE.format(module_content=module_content),
    )
    parsed = _parse_json(raw)

    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            warnings = validate_spec(parsed)
            for warning in warnings:
                print(f"  WARNING: {warning}")
            return parsed
        except SpecValidationError as exc:
            last_error = exc
            if attempt == MAX_ATTEMPTS:
                break

            print(f"  Attempt {attempt} failed validation, retrying with feedback: {exc}")
            raw = llm_client.ask_json(
                system_prompt=spec_guide,
                user_prompt=RETRY_PROMPT_TEMPLATE.format(
                    module_content=module_content,
                    previous_json=json.dumps(parsed, indent=2),
                    errors=str(exc),
                ),
            )
            parsed = _parse_json(raw)

    raise last_error


def main() -> None:
    if not SPEC_PATH.exists():
        raise GenerationError(f"Missing {SPEC_PATH}")

    module_files = sorted(MODULES_DIR.glob("*.md"))
    if not module_files:
        raise GenerationError(f"No .md files found in {MODULES_DIR}")

    spec_guide = SPEC_PATH.read_text()
    OUTPUT_DIR.mkdir(exist_ok=True)

    failures = []

    for module_file in module_files:
        print(f"\n{'=' * 80}\n{module_file.name}\n{'=' * 80}")

        try:
            module_content = module_file.read_text()
            spec = generate_spec_for_module(spec_guide, module_content)
        except (GenerationError, SpecValidationError) as exc:
            print(f"  FAILED: {exc}")
            failures.append(module_file.name)
            continue

        output_path = OUTPUT_DIR / f"{module_file.stem}.json"
        output_path.write_text(json.dumps(spec, indent=2, ensure_ascii=False))
        print(f"  Wrote {output_path} ({len(spec['nodes'])} nodes, {len(spec['edges'])} edges, "
              f"{len(spec.get('steps', []))} steps)")

    if failures:
        print(f"\n{len(failures)} module(s) failed: {failures}")
        sys.exit(1)


if __name__ == "__main__":
    main()
