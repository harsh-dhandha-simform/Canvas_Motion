"""Structural validation against the checklist in SKILL_scene_spec.md
section 15. Hard errors (would break the renderer) raise; soft issues
(style/best-practice guidelines) are returned as warnings so the caller can
log them without discarding an otherwise-usable spec.
"""

import re

ALLOWED_CATEGORIES = {"system-design", "algorithm", "data-structure", "concept"}
ALLOWED_NODE_TYPES = {"custom", "annotation"}
KEBAB_CASE_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class SpecValidationError(RuntimeError):
    pass


def _is_kebab_case(value: str) -> bool:
    return bool(KEBAB_CASE_RE.match(value))


def validate_spec(spec: dict) -> list[str]:
    """Raises SpecValidationError on structural problems. Returns a list of
    warning strings for soft/best-practice issues that don't block usage.
    """

    errors: list[str] = []
    warnings: list[str] = []

    for key in ("metadata", "nodes", "edges"):
        if key not in spec:
            errors.append(f"Missing required top-level key: {key!r}")

    if errors:
        raise SpecValidationError("; ".join(errors))

    metadata = spec["metadata"]
    for key in ("title", "description", "category"):
        if key not in metadata:
            errors.append(f"metadata missing required key: {key!r}")

    if metadata.get("category") not in ALLOWED_CATEGORIES:
        errors.append(
            f"metadata.category {metadata.get('category')!r} not in {ALLOWED_CATEGORIES}"
        )

    nodes = spec["nodes"]
    edges = spec["edges"]
    steps = spec.get("steps", [])

    node_ids = [n.get("id") for n in nodes]
    edge_ids = [e.get("id") for e in edges]
    step_ids = [s.get("id") for s in steps]

    all_ids = node_ids + edge_ids + step_ids
    seen = set()
    for _id in all_ids:
        if _id in seen:
            errors.append(f"Duplicate id: {_id!r}")
        seen.add(_id)

    node_id_set = set(node_ids)
    edge_id_set = set(edge_ids)
    annotation_ids = set()

    for node in nodes:
        node_id = node.get("id")

        if not node_id or not _is_kebab_case(node_id):
            errors.append(f"Node id not kebab-case: {node_id!r}")

        if node.get("type") not in ALLOWED_NODE_TYPES:
            errors.append(f"Node {node_id!r} has invalid type: {node.get('type')!r}")
        elif node["type"] == "annotation":
            annotation_ids.add(node_id)

        position = node.get("position")
        if position != {"x": 0, "y": 0}:
            errors.append(f"Node {node_id!r} position must be {{'x':0,'y':0}}, got {position!r}")

        label = node.get("data", {}).get("label", "")
        if len(label) > 30:
            warnings.append(f"Node {node_id!r} label exceeds 30 chars: {label!r}")

    if len(nodes) > 15:
        warnings.append(f"{len(nodes)} nodes exceeds the recommended max of 15")

    if len(annotation_ids) > 3:
        warnings.append(f"{len(annotation_ids)} annotation nodes exceeds the recommended max of 3")

    for edge in edges:
        edge_id = edge.get("id")

        if not edge_id or not _is_kebab_case(edge_id):
            errors.append(f"Edge id not kebab-case: {edge_id!r}")

        source, target = edge.get("source"), edge.get("target")
        if source not in node_id_set:
            errors.append(f"Edge {edge_id!r} source {source!r} does not exist in nodes")
        if target not in node_id_set:
            errors.append(f"Edge {edge_id!r} target {target!r} does not exist in nodes")
        if source in annotation_ids or target in annotation_ids:
            errors.append(f"Edge {edge_id!r} connects to an annotation node - not allowed")

        label = edge.get("label")
        if label and len(label) > 25:
            warnings.append(f"Edge {edge_id!r} label exceeds 25 chars: {label!r}")

    if len(edges) > 15:
        warnings.append(f"{len(edges)} edges exceeds the recommended max of 15")

    if steps and not (3 <= len(steps) <= 6):
        warnings.append(f"{len(steps)} steps is outside the recommended 3-6 range")

    for step in steps:
        step_id = step.get("id")

        for node_ref in step.get("highlightNodes", []):
            if node_ref not in node_id_set:
                errors.append(f"Step {step_id!r} highlightNodes references unknown node {node_ref!r}")

        for edge_ref in step.get("highlightEdges", []):
            if edge_ref not in edge_id_set:
                errors.append(f"Step {step_id!r} highlightEdges references unknown edge {edge_ref!r}")

        highlight_count = len(step.get("highlightNodes", []))
        if not (2 <= highlight_count <= 5):
            warnings.append(
                f"Step {step_id!r} has {highlight_count} highlightNodes, recommended 2-5"
            )

    flow_node_ids = node_id_set - annotation_ids
    connected_ids = {e.get("source") for e in edges} | {e.get("target") for e in edges}
    for node_id in flow_node_ids - connected_ids:
        errors.append(f"Flow node {node_id!r} has no edges connecting it")

    if errors:
        raise SpecValidationError("; ".join(errors))

    return warnings
