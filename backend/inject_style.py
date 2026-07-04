import json

with open("../shared/componentCatalog.json", "r") as f:
    catalog = json.load(f)

for comp_name, comp_data in catalog.items():
    if "schema" in comp_data and "properties" in comp_data["schema"]:
        comp_data["schema"]["properties"]["style"] = {
            "type": "object",
            "description": "Optional CSS properties to dynamically style the component wrapper (e.g. padding, backgroundColor)."
        }

with open("../shared/componentCatalog.json", "w") as f:
    json.dump(catalog, f, indent=2)

print("Injected 'style' into all components in catalog!")
