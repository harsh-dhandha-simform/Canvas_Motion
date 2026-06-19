"""
backend/main.py — Pipeline Orchestrator with LangGraph and Checkpointing

Entry point for the 6-Agent Video Production Pipeline.

Usage:
    python backend/main.py "Consistent Hashing"
    python backend/main.py "Kubernetes Pod Scheduling" --skip-audio
    python backend/main.py "Consistent Hashing" --restart
"""

import argparse
import logging
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: ensure the repo root is on sys.path so `backend.*` imports work
# regardless of where the user runs `python backend/main.py` from.
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from config import (
    GENERATED_DIR,
    VIDEO_DURATION_FRAMES,
    VIDEO_FPS,
)
from graph.pipeline import create_pipeline
from langgraph.checkpoint.sqlite import SqliteSaver

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pipeline")


# ---------------------------------------------------------------------------
# Pipeline Execution
# ---------------------------------------------------------------------------

def run_pipeline(topic: str, restart: bool = False) -> None:
    """
    Execute the full pipeline for the given topic using LangGraph.

    Args:
        topic:      The subject of the educational video.
        restart:    If True, clears previous checkpoints for this topic and restarts.
    """
    pipeline_start = time.perf_counter()

    # Clean up topic to make a thread-safe identifier
    thread_id = topic.lower().strip().replace(" ", "_")
    # Clean up any non-alphanumeric/underscore characters for cleaner IDs
    thread_id = "".join(c for c in thread_id if c.isalnum() or c == "_")[:80]

    db_dir = Path(__file__).resolve().parent / "checkpoints"
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = db_dir / "pipeline.db"

    builder = create_pipeline()

    with SqliteSaver.from_conn_string(str(db_path)) as checkpointer:
        graph = builder.compile(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": thread_id}}

        if restart:
            logger.info("🗑️  Restart flag passed. Clearing existing checkpoint for thread: %s", thread_id)
            checkpointer.delete_thread(thread_id=thread_id)
            import shutil
            if GENERATED_DIR.exists():
                logger.info("🗑️  Clearing generated files directory: %s", GENERATED_DIR)
                shutil.rmtree(GENERATED_DIR)

        state_snapshot = graph.get_state(config)

        # Determine if we should resume or start fresh
        if state_snapshot.next:
            logger.info("=" * 60)
            logger.info("🔄 Resuming Video Production Pipeline from Crash/Interruption")
            logger.info("   Topic : %r", topic)
            logger.info("   From  : %s", ", ".join(state_snapshot.next))
            logger.info("=" * 60)

            inputs = None  # Resumes from checkpoint
        else:
            if state_snapshot.values:
                # If there are values but no next steps, it completed successfully.
                logger.info("=" * 60)
                logger.info("✅ Pipeline already completed successfully for this topic.")
                logger.info("   To re-run from scratch, use the --restart flag.")
                logger.info("=" * 60)
                return

            # Start fresh
            logger.info("=" * 60)
            logger.info("🎬 Starting Video Production Pipeline")
            logger.info("   Topic : %r", topic)
            logger.info("   Target: %s", GENERATED_DIR)
            logger.info("=" * 60)

            inputs = {"topic": topic}

        # Stream the graph execution
        for event in graph.stream(inputs, config, stream_mode="updates"):
            for node_name, state_update in event.items():
                logger.info("   ✅ Node %r completed successfully", node_name)

        # Retrieve the final state to log summary
        final_state = graph.get_state(config).values
        timing = final_state.get("timing") or {}
        total_frames: int = timing.get("total_frames", VIDEO_DURATION_FRAMES)

        elapsed = time.perf_counter() - pipeline_start
        logger.info("=" * 60)
        logger.info("✅ Pipeline execution completed in %.1fs", elapsed)
        logger.info("   Output : %s", GENERATED_DIR)
        logger.info("   Frames : %d  (%.1fs @ %dfps)", total_frames, total_frames / VIDEO_FPS, VIDEO_FPS)
        logger.info("")
        logger.info("  Next steps:")
        logger.info("    cd frontend && npm run dev")
        logger.info("  Then open http://localhost:3000 in Remotion Studio.")
        logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="🎬 AI Video Production Pipeline — generates a Remotion TSX from a topic.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backend/main.py "Consistent Hashing"
  python backend/main.py "Consistent Hashing" --restart
        """,
    )
    parser.add_argument("topic", help="The topic of the educational video.")
    parser.add_argument(
        "--restart",
        "-r",
        action="store_true",
        default=False,
        help="Restart the pipeline from scratch, clearing any saved checkpoints.",
    )

    args = parser.parse_args()

    try:
        run_pipeline(args.topic, restart=args.restart)
    except KeyboardInterrupt:
        logger.info("\n⚠️  Pipeline interrupted by user.")
        sys.exit(1)
    except Exception as exc:
        logger.error("❌ Pipeline failed: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
