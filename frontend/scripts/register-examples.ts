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

// Scan curated demos AND generated (gitignored) outputs so both are previewable.
const SOURCE_DIRS = [
  { dir: resolve(__dirname, "../../shared/examples"), rel: "../../../shared/examples" },
  { dir: resolve(__dirname, "../../shared/generated"), rel: "../../../shared/generated" },
];
const OUT_DIR = resolve(__dirname, "../src/generated");
const OUT_FILE = join(OUT_DIR, "examples.generated.ts");

function slugFromFilename(filename: string): string {
  const base = basename(filename, ".json");
  // Remotion Composition id allows: a-z, A-Z, 0-9, CJK, and -
  return base.replace(/_/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
}

function buildExamplesMap(): string {
  // slug → require path. A generated script with the same slug overrides its demo.
  const bySlug = new Map<string, string>();

  for (const { dir, rel } of SOURCE_DIRS) {
    let files: string[] = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      continue; // dir may not exist (e.g. no generations yet) — skip quietly
    }
    for (const file of files.sort()) {
      const slug = slugFromFilename(file);
      const filePath = join(dir, file);
      try {
        JSON.parse(readFileSync(filePath, "utf-8")); // validate it's valid JSON
        bySlug.set(slug, `${rel}/${file}`);
        console.log(`  ✅  ${slug}`);
      } catch (err) {
        console.warn(`  ⚠️  Skipping ${file}: ${err}`);
      }
    }
  }

  const entries = [...bySlug.entries()].map(
    ([slug, req]) => `  "${slug}": require("${req}") as VideoScriptProps,`,
  );

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
