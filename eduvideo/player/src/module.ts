// Loads a job's module bundle (written by app/player/builder.py as module.json) and
// runtime-validates it against the Concepts/Interactions contracts (Phase 12
// deliverable #2). Any shape mismatch fails loudly with a clear message rather than
// crashing deep inside a widget.
import { Concepts, Interactions } from "./types";

export interface Module {
  jobId: string;
  videoUrl: string;
  concepts: Concepts;
  interactions: Interactions;
}

function fail(msg: string): never {
  throw new Error(`Invalid module data: ${msg}`);
}

function assertConcepts(c: unknown): asserts c is Concepts {
  if (!c || typeof c !== "object") fail("concepts missing");
  const concepts = (c as Concepts).concepts;
  if (!Array.isArray(concepts) || concepts.length === 0) fail("concepts.concepts must be a non-empty array");
  for (const [i, w] of concepts.entries()) {
    if (typeof w.id !== "string") fail(`concept[${i}].id must be a string`);
    if (typeof w.start !== "number" || typeof w.end !== "number") fail(`concept[${i}] needs numeric start/end`);
    if (w.end < w.start) fail(`concept[${i}] end < start`);
  }
}

function assertInteractions(x: unknown): asserts x is Interactions {
  if (!x || typeof x !== "object") fail("interactions missing");
  const list = (x as Interactions).interactions;
  if (!Array.isArray(list)) fail("interactions.interactions must be an array");
  for (const [i, it] of list.entries()) {
    if (typeof it.concept_id !== "string") fail(`interaction[${i}].concept_id must be a string`);
    if (typeof it.type !== "string") fail(`interaction[${i}].type must be a string`);
  }
}

/** Reads ?job=<id> from the URL (the API opens the player at /player/?job=<id>). */
export function jobIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("job");
}

export async function loadModule(jobId: string): Promise<Module> {
  const res = await fetch(`/jobs/${encodeURIComponent(jobId)}/module.json`);
  if (!res.ok) {
    throw new Error(`Could not load module for job ${jobId} (HTTP ${res.status}). Is the job complete?`);
  }
  const data = (await res.json()) as Partial<Module>;
  assertConcepts(data.concepts);
  assertInteractions(data.interactions);
  if (typeof data.videoUrl !== "string") fail("videoUrl missing");
  return {
    jobId,
    videoUrl: data.videoUrl,
    concepts: data.concepts,
    interactions: data.interactions,
  };
}
