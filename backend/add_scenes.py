import json

file_path = "../shared/examples/full-showcase.json"
with open(file_path, "r") as f:
    data = json.load(f)

outro = data["scenes"].pop()

new_scenes = [
    {
        "id": "split-screen",
        "type": "SplitScreen",
        "duration_frames": 240,
        "transition": "slideLeft",
        "data": {
            "title": "React Component Architecture",
            "bullets": ["State is isolated per component", "Props pass data down", "Hooks manage side-effects"],
            "code": "function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count+1)}>{count}</button>;\n}",
            "mediaUrl": ""
        }
    },
    {
        "id": "typewriter",
        "type": "TypewriterText",
        "duration_frames": 180,
        "transition": "fade",
        "data": {
            "lines": ["Hello, World!", "This is Canvas Motion.", "Automated video generation."],
            "accentColor": "#f59e0b"
        }
    },
    {
        "id": "code-block",
        "type": "CodeBlock",
        "duration_frames": 180,
        "transition": "slideUp",
        "data": {
            "code": "def hello():\n    print('world')",
            "language": "python",
            "filename": "hello.py",
            "highlightLines": [1, 2]
        }
    },
    {
        "id": "arch-diagram",
        "type": "ArchitectureDiagram",
        "duration_frames": 300,
        "transition": "zoom",
        "data": {
            "title": "System Architecture",
            "nodes": [
                {"id": "lb", "label": "Load Balancer", "type": "LoadBalancer", "x": 20, "y": 50},
                {"id": "api", "label": "API Server", "type": "Server", "x": 50, "y": 30},
                {"id": "db", "label": "Database", "type": "Database", "x": 80, "y": 50}
            ],
            "connections": [
                {"fromId": "lb", "toId": "api", "label": "HTTPS", "animated": True},
                {"fromId": "api", "toId": "db", "label": "TCP", "animated": True}
            ]
        }
    },
    {
        "id": "packet-flow",
        "type": "PacketFlow",
        "duration_frames": 300,
        "transition": "slideLeft",
        "data": {
            "title": "TCP Handshake",
            "nodes": [
                {"id": "client", "label": "Client", "x": 20, "y": 50},
                {"id": "server", "label": "Server", "x": 80, "y": 50}
            ],
            "packets": [
                {"id": "p1", "fromId": "client", "toId": "server", "label": "SYN", "startFrame": 30, "endFrame": 90, "color": "#38BDF8"},
                {"id": "p2", "fromId": "server", "toId": "client", "label": "SYN-ACK", "startFrame": 100, "endFrame": 160, "color": "#34d399"},
                {"id": "p3", "fromId": "client", "toId": "server", "label": "ACK", "startFrame": 170, "endFrame": 230, "color": "#f59e0b"}
            ]
        }
    },
    {
        "id": "http-exchange",
        "type": "HttpExchange",
        "duration_frames": 240,
        "transition": "fade",
        "data": {
            "title": "REST API Request",
            "request": {
                "method": "POST",
                "path": "/api/users",
                "headers": {"Content-Type": "application/json", "Authorization": "Bearer token123"},
                "body": '{\n  "name": "Alice"\n}'
            },
            "response": {
                "statusCode": 201,
                "statusText": "Created",
                "headers": {"Content-Type": "application/json"},
                "body": '{\n  "id": 42,\n  "name": "Alice"\n}'
            }
        }
    },
    {
        "id": "sort-viz",
        "type": "SortingVisualizer",
        "duration_frames": 300,
        "transition": "slideUp",
        "data": {
            "title": "Quick Sort",
            "algorithm": "quick",
            "values": [9, 3, 7, 5, 6, 4, 8, 2],
            "showComparisonCounter": True
        }
    },
    {
        "id": "linear-struct",
        "type": "LinearStructure",
        "duration_frames": 300,
        "transition": "slideLeft",
        "data": {
            "title": "Stack Operations",
            "kind": "stack",
            "initial": [10, 20],
            "operations": [
                {"op": "push", "value": 30},
                {"op": "push", "value": 40},
                {"op": "pop"}
            ],
            "showHeadTail": True
        }
    },
    {
        "id": "array-algo",
        "type": "ArrayAlgorithm",
        "duration_frames": 300,
        "transition": "zoom",
        "data": {
            "title": "Binary Search",
            "mode": "binary-search",
            "values": [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            "target": 23
        }
    },
    {
        "id": "dp-table",
        "type": "DPTableVisualizer",
        "duration_frames": 300,
        "transition": "fade",
        "data": {
            "title": "Fibonacci DP",
            "rows": 1,
            "cols": 6,
            "colLabels": ["0", "1", "2", "3", "4", "5"],
            "fills": [
                {"row": 0, "col": 0, "value": 0},
                {"row": 0, "col": 1, "value": 1},
                {"row": 0, "col": 2, "value": 1, "dependsOn": [{"row": 0, "col": 0}, {"row": 0, "col": 1}]},
                {"row": 0, "col": 3, "value": 2, "dependsOn": [{"row": 0, "col": 1}, {"row": 0, "col": 2}]},
                {"row": 0, "col": 4, "value": 3, "dependsOn": [{"row": 0, "col": 2}, {"row": 0, "col": 3}]},
                {"row": 0, "col": 5, "value": 5, "dependsOn": [{"row": 0, "col": 3}, {"row": 0, "col": 4}]}
            ]
        }
    },
    {
        "id": "graph-trav",
        "type": "GraphTraversal",
        "duration_frames": 300,
        "transition": "slideUp",
        "data": {
            "title": "BFS Traversal",
            "algorithm": "bfs",
            "nodes": [
                {"id": "A", "x": 50, "y": 20},
                {"id": "B", "x": 30, "y": 50},
                {"id": "C", "x": 70, "y": 50},
                {"id": "D", "x": 50, "y": 80}
            ],
            "edges": [
                {"from": "A", "to": "B"},
                {"from": "A", "to": "C"},
                {"from": "B", "to": "D"},
                {"from": "C", "to": "D"}
            ],
            "start": "A",
            "showDistanceTable": False
        }
    },
    {
        "id": "rec-tree",
        "type": "RecursionTree",
        "duration_frames": 300,
        "transition": "slideLeft",
        "data": {
            "title": "Recursive Factorial",
            "root": {
                "label": "fact(3)",
                "returns": 6,
                "children": [
                    {
                        "label": "fact(2)",
                        "returns": 2,
                        "children": [
                            {
                                "label": "fact(1)",
                                "returns": 1,
                                "children": [
                                    { "label": "fact(0)", "returns": 1 }
                                ]
                            }
                        ]
                    }
                ]
            },
            "showReturns": True,
            "memoized": []
        }
    }
]

data["scenes"].extend(new_scenes)
data["scenes"].append(outro)

with open(file_path, "w") as f:
    json.dump(data, f, indent=2)

print("Updated full-showcase.json successfully!")
