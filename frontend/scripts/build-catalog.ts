import fs from "fs";
import path from "path";
import { COMPONENT_CATALOG } from "../src/registry";

const SHARED_DIR = path.resolve(__dirname, "../../shared");
const CATALOG_PATH = path.join(SHARED_DIR, "componentCatalog.json");

function buildCatalog() {
  console.log("Building component catalog...");
  
  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }

  const output = JSON.stringify(COMPONENT_CATALOG, null, 2);
  fs.writeFileSync(CATALOG_PATH, output, "utf-8");
  
  console.log(`✅ Component catalog written to ${CATALOG_PATH}`);
}

buildCatalog();
