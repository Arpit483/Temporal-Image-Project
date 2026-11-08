"""Generate TypeScript types from FastAPI OpenAPI schema."""
import json
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from framefill.api import app

def generate():
    schema = app.openapi()
    out_json = Path(__file__).resolve().parent.parent / "web" / "src" / "openapi.json"
    out_ts = Path(__file__).resolve().parent.parent / "web" / "src" / "openapi_types.ts"
    
    out_json.write_text(json.dumps(schema, indent=2), encoding="utf-8")
    
    # Generate simple TypeScript interface definitions from schemas
    lines = [
        "// Auto-generated from FastAPI OpenAPI schema",
        "// Do not edit directly",
        "",
    ]
    schemas = schema.get("components", {}).get("schemas", {})
    for name, s in schemas.items():
        lines.append(f"export interface {name} {{")
        props = s.get("properties", {})
        required = s.get("required", [])
        for p_name, p_info in props.items():
            t = p_info.get("type", "any")
            ts_type = "any"
            if t == "string":
                ts_type = "string"
            elif t in ("integer", "number"):
                ts_type = "number"
            elif t == "boolean":
                ts_type = "boolean"
            elif t == "array":
                item_type = p_info.get("items", {}).get("type", "any")
                ts_type = f"{item_type}[]"
            elif "$ref" in p_info:
                ts_type = p_info["$ref"].split("/")[-1]
            opt = "" if p_name in required else "?"
            lines.append(f"  {p_name}{opt}: {ts_type};")
        lines.append("}\n")
    
    out_ts.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_json} and {out_ts}")

if __name__ == "__main__":
    generate()
