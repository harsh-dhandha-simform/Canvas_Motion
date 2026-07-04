"""Player build stage (Phase 12 deliverable #8). Rather than produce a separate
static bundle per job, we build the player app ONCE (player/dist, served by the API)
and have it load a job by id. This stage writes that job's `module.json` — the small
manifest the player fetches at runtime: the video URL plus the concept spine and the
interaction plan inlined. This is the simpler of the two approaches the phase doc
offers and keeps the (large) JS bundle out of every job folder.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.clients.tracing import span
from app.jobs import read_artifact
from app.schemas.concepts import Concepts
from app.schemas.interactions import Interactions


def run(job_dir: Path) -> None:
    job_id = job_dir.name
    player_dir = job_dir / "player"
    player_dir.mkdir(exist_ok=True)

    with span("player_build", input=job_id) as obs:
        if not (job_dir / "rendered.mp4").exists():
            raise FileNotFoundError("player: rendered.mp4 missing — render stage must run first")

        # Read + revalidate the two contracts the player consumes, then inline them
        # into module.json (the player runtime-validates again on load).
        concepts = read_artifact(job_dir, "concepts", Concepts)
        interactions = read_artifact(job_dir, "interactions", Interactions)

        module = {
            "jobId": job_id,
            "videoUrl": f"/jobs/{job_id}/video",
            "concepts": concepts.model_dump(by_alias=True),
            "interactions": interactions.model_dump(by_alias=True),
        }
        module_path = player_dir / "module.json"
        module_path.write_text(json.dumps(module, indent=2), encoding="utf-8")

        obs.update(
            output=f"{len(concepts.concepts)} concepts, {len(interactions.interactions)} interactions "
            f"→ {module_path.name}"
        )
