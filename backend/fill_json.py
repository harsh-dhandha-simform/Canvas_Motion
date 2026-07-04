import json

with open("checkpoints/breadth-first-search-60s/story.json", "r") as f:
    story = json.load(f)

with open("../shared/examples/breadth-first-search.json", "r") as f:
    final = json.load(f)

print(f"Story scenes: {len(story['scenes'])}, Final scenes: {len(final['scenes'])}")

# Zip them safely
for i, final_scene in enumerate(final["scenes"]):
    if i >= len(story["scenes"]):
        break
    story_scene = story["scenes"][i]
    visual_panels = story_scene.get("panels", {})
    
    for panel in final_scene.get("panels", []):
        area = panel["area"]
        # If the visual architect generated data for this area, inject it
        if area in visual_panels:
            raw_data = visual_panels[area]
            # Unwrap if nested
            if isinstance(raw_data, dict) and "data" in raw_data and isinstance(raw_data["data"], dict):
                data = raw_data["data"]
            else:
                data = raw_data
                
            # Merge while keeping any existing fields like title
            for k, v in data.items():
                panel["data"][k] = v

with open("../shared/examples/breadth-first-search.json", "w") as f:
    json.dump(final, f, indent=2)

print("Final JSON successfully populated with rich visual data!")
