// Concept sync (Phase 12 deliverable #5). The <video> element is the single source
// of truth for time (MASTER_CONTEXT §2.1); given the concept spine, this maps a
// currentTime to the concept whose [start, end) window contains it. Concept windows
// are contiguous and non-overlapping (enforced upstream by the concept_spine stage),
// so a simple linear scan is correct and cheap.
import { ConceptWindow, Concepts } from "./types";

/** The concept active at `time`, or null before the first / after the last window. */
export function conceptAt(concepts: Concepts, time: number): ConceptWindow | null {
  const windows = concepts.concepts;
  for (const w of windows) {
    if (time >= w.start && time < w.end) return w;
  }
  // Clamp: at/after the last window's end (e.g. trailing outro), keep showing the
  // last concept so the panel doesn't blank out at the very end.
  const last = windows[windows.length - 1];
  if (last && time >= last.end) return last;
  return null;
}

/** Fraction [0,1] through the whole spine at `time` — for a progress indicator. */
export function progressAt(concepts: Concepts, time: number): number {
  const total = concepts.totalDurationSec || concepts.concepts[concepts.concepts.length - 1]?.end || 1;
  return Math.max(0, Math.min(1, time / total));
}
