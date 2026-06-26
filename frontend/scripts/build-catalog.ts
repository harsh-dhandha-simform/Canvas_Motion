import fs from "fs";
import path from "path";
import { COMPONENT_CATALOG, COMPONENT_META } from "../src/registry";

const SHARED_DIR = path.resolve(__dirname, "../../shared");
const CATALOG_PATH = path.join(SHARED_DIR, "componentCatalog.json");

/**
 * Emits shared/componentCatalog.json — the single source of truth the backend
 * agents read. Each entry merges:
 *   - description + schema   (from COMPONENT_CATALOG, schema via zod v4 native converter)
 *   - category/dataOwner/bestAreas/useWhen/tags/minSeconds (from COMPONENT_META)
 *
 * The backend never imports React; it only consumes this JSON.
 */
function buildCatalog() {
  console.log("Building component catalog...");

  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }

  const merged: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(COMPONENT_CATALOG)) {
    const meta = COMPONENT_META[name as keyof typeof COMPONENT_META];
    if (!meta) {
      throw new Error(`Component "${name}" has no COMPONENT_META entry in registry.ts`);
    }
    merged[name] = { ...entry, ...meta };
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`✅ Component catalog written to ${CATALOG_PATH} (${Object.keys(merged).length} components)`);
}

buildCatalog();
