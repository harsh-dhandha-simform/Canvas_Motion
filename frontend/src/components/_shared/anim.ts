// Pure helpers shared by algorithm visualiser components.
// No React imports — safe to use in step generators too.

export const REVEAL_FRAMES = 18;

export function mix(a: string, b: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const bl = Math.round(ab + (bb - ab) * clamped);
  return "#" + toHex(r) + toHex(g) + toHex(bl);
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(v: number): string {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
}

export function stepAt(
  step: number,
  opts: { stepFrames: number; frame: number; fps: number }
): { progress: number; entering: boolean } {
  const start = step * opts.stepFrames;
  const local = opts.frame - start;
  const progress = Math.max(0, Math.min(1, local / opts.stepFrames));
  const entering = local >= 0 && local < REVEAL_FRAMES;
  return { progress, entering };
}

export function resolveSteps<T>(
  explicit: T[] | undefined,
  generate: () => T[]
): T[] {
  return explicit && explicit.length > 0 ? explicit : generate();
}
