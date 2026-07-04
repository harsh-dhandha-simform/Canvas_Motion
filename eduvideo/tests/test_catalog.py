"""Plain-script test (run: uv run python tests/test_catalog.py)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.engine.catalog import data_owner, get_catalog, get_schema, validate_panel_data


def main() -> None:
    c = get_catalog()
    assert len(c) == 34, f"expected 34 components, got {len(c)}"
    assert data_owner("FlowDiagram") == "visual"
    assert data_owner("BulletList") == "content"
    assert get_schema("BulletList")["properties"], "BulletList schema empty"
    ok, err = validate_panel_data("BulletList", {"title": "T", "items": ["a", "b"]})
    assert ok, err
    ok, err = validate_panel_data("NopeComponent", {})
    assert not ok, "unknown component should fail"
    print("test_catalog: PASS")


if __name__ == "__main__":
    main()
