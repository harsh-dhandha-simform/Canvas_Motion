import asyncio
import os
from graph.pipeline import compiled_graph
from graph.state import PipelineState
from utils.checkpoint import checkpoint_slug, checkpoint_dir

def main():
    topic = "Breadth first search"
    duration = 60
    slug = checkpoint_slug(topic, duration)
    
    # Delete downstream checkpoints so they are regenerated using the new merge_node logic
    for stage in ["scenes", "validation_report", "video_script"]:
        file_path = checkpoint_dir(slug) / f"{stage}.json"
        if file_path.exists():
            os.remove(file_path)
            print(f"Removed {stage}.json")
            
    initial_state = {
        "topic": topic,
        "duration_seconds": duration,
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "checkpoint_slug": slug,
        "force_restart": False,
        "enable_audio": True,
        "audio_path": None,
        "audio_url": None,
        "syllabus": None,
        "plan": None,
        "script": None,
        "story": None,
        "scenes": None,
        "captions": None,
        "video_script": None,
        "validation_report": None,
        "errors": [],
        "model_used": None,
        "fallback_triggered": False,
    }
    
    print("Running pipeline for Breadth first search...")
    result = compiled_graph.invoke(initial_state)
    print("Pipeline finished!")

if __name__ == "__main__":
    main()
