/**
 * frontend/scripts/register-examples.ts
 *
 * Reads all *.json files from shared/examples/ and emits
 * frontend/src/generated/examples.generated.ts with a typed EXAMPLE_SCRIPTS map.
 *
 * Run: tsx scripts/register-examples.ts
 * Hooked into: predev, prebuild (via package.json)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, join, basename } from "path";

const EXAMPLES_DIR = resolve(__dirname, "../../shared/examples");
const OUT_DIR = resolve(__dirname, "../src/generated");
const OUT_FILE = join(OUT_DIR, "examples.generated.ts");

function slugFromFilename(filename: string): string {
  const base = basename(filename, ".json");
  // Remotion Composition id allows: a-z, A-Z, 0-9, CJK, and -
  return base.replace(/_/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
}

function buildExamplesMap(): string {
  let files: string[] = [];
  try {
    files = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.warn(`[register-examples] shared/examples/ not found — writing empty map`);
  }

  const entries: string[] = [];

  for (const file of files.sort()) {
    const slug = slugFromFilename(file);
    const filePath = join(EXAMPLES_DIR, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      JSON.parse(content); // validate it's valid JSON
      // Use a relative require path for the generated file
      entries.push(
        `  "${slug}": require("../../../shared/examples/${file}") as VideoScriptProps,`
      );
      console.log(`  ✅  ${slug}`);
    } catch (err) {
      console.warn(`  ⚠️  Skipping ${file}: ${err}`);
    }
  }

  const body = entries.length > 0 ? "\n" + entries.join("\n") + "\n" : "";

  return `/**
 * AUTO-GENERATED — do not edit manually.
 * Run \`npm run register-examples\` to regenerate.
 * Generated from: shared/examples/*.json
 */

import { VideoScriptProps } from "../DynamicVideo";

export const EXAMPLE_SCRIPTS: Record<string, VideoScriptProps> = {${body}};

export const EXAMPLE_SLUGS = Object.keys(EXAMPLE_SCRIPTS) as string[];
`;
}

mkdirSync(OUT_DIR, { recursive: true });
const output = buildExamplesMap();
writeFileSync(OUT_FILE, output, "utf-8");
console.log(`\n[register-examples] ✅ Written to ${OUT_FILE}`);
