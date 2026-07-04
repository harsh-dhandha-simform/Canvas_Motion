import json

with open("../shared/examples/breadth-first-search.json", "r") as f:
    final = json.load(f)

for scene in final["scenes"]:
    for panel in scene.get("panels", []):
        if panel["type"] == "TwoColumnLayout":
            # Fix TwoColumnLayout empty points
            data = panel.setdefault("data", {})
            left = data.setdefault("left", {})
            right = data.setdefault("right", {})
            left.setdefault("heading", "Pros")
            left.setdefault("points", ["Efficient", "Optimal"])
            right.setdefault("heading", "Cons")
            right.setdefault("points", ["Memory heavy", "O(V) space"])

        # Also just inject dummy data for any other empty content panels to prevent crashes
        if panel["type"] == "BulletList":
            data = panel.setdefault("data", {})
            data.setdefault("items", ["Queue based", "Level by level", "Shortest path"])
        
        if panel["type"] == "ComparisonCard":
            data = panel.setdefault("data", {})
            data.setdefault("pros", ["Guarantees shortest path", "Simple to implement"])
            data.setdefault("cons", ["High memory usage for wide graphs", "Unweighted edges only"])
            
        if panel["type"] == "StepFlow":
            data = panel.setdefault("data", {})
            data.setdefault("steps", ["Enqueue start node", "Dequeue node", "Enqueue unvisited neighbors", "Repeat"])
            
        if panel["type"] == "CodeBlock":
            data = panel.setdefault("data", {})
            data.setdefault("code", "def bfs(graph, start):\n    queue = [start]\n    visited = {start}\n    while queue:\n        node = queue.pop(0)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)")
            
        if panel["type"] == "NumberedList":
            data = panel.setdefault("data", {})
            data.setdefault("items", ["Initialize queue", "Mark start as visited", "Loop until empty"])

with open("../shared/examples/breadth-first-search.json", "w") as f:
    json.dump(final, f, indent=2)

print("Fixed TwoColumnLayout and added fallback content data!")
