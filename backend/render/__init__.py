"""Backend video rendering — VideoScript JSON → mp4 via `npx remotion render`.

Ported from the standalone adapter.py / remotion_adapter.py and adapted to this
repo (composition "DynamicVideo", config.py constants, HTTP-served audio). The
job-dir/manifest/revideo machinery from the source is intentionally dropped — it
belonged to a different orchestration framework.
"""
