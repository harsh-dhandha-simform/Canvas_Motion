import asyncio
import json
import sys
from server import generate_script, GenerateScriptRequest

def test():
    req = GenerateScriptRequest(
        topic="Horizontal vs Vertical Scaling",
        duration_seconds=60,
        style="educational"
    )
    res = generate_script(req)
    print(json.dumps(res.model_dump(), indent=2))

if __name__ == "__main__":
    test()
