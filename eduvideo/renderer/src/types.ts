// Mirrors app/schemas/video_plan.py (VideoPlan) — the AI<->renderer boundary
// (MASTER_CONTEXT.md §6.1). Keep in sync: any change to the Pydantic models must be
// mirrored here in the same phase.

export type Template =
  | "TitleScene"
  | "DefinitionScene"
  | "BulletListScene"
  | "DiagramScene"
  | "CodeScene"
  | "ComparisonScene"
  | "ChartScene"
  | "QuizScene"
  | "RecapScene"
  | "OutroScene";

export type AnimationPreset = "fadeIn" | "slideUp" | "popIn" | "none";

export type DiagramType =
  | "flow"
  | "sequence"
  | "architecture"
  | "state"
  | "tree"
  | "graph"
  | "stack"
  | "timeline";

export type ChartType = "bar" | "line";

export type CodeLanguage =
  | "python"
  | "js"
  | "ts"
  | "java"
  | "c"
  | "cpp"
  | "go"
  | "rust"
  | "sql"
  | "bash"
  | "pseudocode";

export interface VideoStyle {
  theme: string;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
}

export interface VideoMeta {
  title: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  style: VideoStyle;
}

export interface AudioRef {
  voiceoverFile: string;
}

export interface Subtitle {
  start: number;
  end: number;
  text: string;
  highlight: string[];
}

export interface DiagramNode {
  id: string;
  label: string;
  type?: string;
  group?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  direction?: string;
}

export interface TitleProps {
  title: string;
  subtitle?: string;
}

export interface DefinitionProps {
  term: string;
  definition: string;
  keywords: string[];
}

export interface BulletListProps {
  heading: string;
  items: string[]; // >= 2
}

export interface DiagramProps {
  diagramType: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  labels: string[];
  caption?: string;
}

export interface CodeStep {
  highlightLines: number[];
  note?: string;
}

export interface CodeProps {
  language: CodeLanguage;
  code: string;
  highlightLines: number[];
  caption?: string;
  steps: CodeStep[];
}

export interface ComparisonSide {
  title: string;
  points: string[];
}

export interface ComparisonProps {
  heading: string;
  left: ComparisonSide;
  right: ComparisonSide;
}

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ChartProps {
  chartType: ChartType;
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  caption?: string;
}

export interface QuizProps {
  question: string;
  options: string[];
  answer: string; // must be one of options
}

export interface RecapProps {
  heading: string;
  points: string[];
}

export interface OutroProps {
  message: string;
}

export type PlanSceneProps =
  | TitleProps
  | DefinitionProps
  | BulletListProps
  | DiagramProps
  | CodeProps
  | ComparisonProps
  | ChartProps
  | QuizProps
  | RecapProps
  | OutroProps;

export interface PlanScene {
  id: string;
  concept_id: string;
  template: Template;
  start: number;
  duration: number;
  animation: AnimationPreset;
  props: PlanSceneProps;
}

export interface VideoPlan {
  video: VideoMeta;
  audio: AudioRef;
  subtitles: Subtitle[];
  scenes: PlanScene[];
}

/**
 * Structural sanity check on the `videoPlan` variable passed into `renderVideo()`.
 * The Python validator (app/validation/validator.py) is the authoritative schema
 * check — this only guards against the render getting invoked with the wrong
 * variable name, a truncated/malformed JSON blob, or similarly gross mistakes, so
 * failures surface as a clear message instead of a confusing crash deep in a scene.
 */
export function assertVideoPlan(data: unknown): VideoPlan {
  if (typeof data !== "object" || data === null) {
    throw new Error("videoPlan variable is missing or not an object — was it passed to renderVideo()?");
  }
  const plan = data as Record<string, unknown>;

  if (typeof plan.video !== "object" || plan.video === null) {
    throw new Error("videoPlan.video is missing or not an object");
  }
  const video = plan.video as Record<string, unknown>;
  for (const key of ["title", "width", "height", "fps", "durationSec", "style"]) {
    if (!(key in video)) throw new Error(`videoPlan.video.${key} is missing`);
  }

  if (typeof plan.audio !== "object" || plan.audio === null || typeof (plan.audio as any).voiceoverFile !== "string") {
    throw new Error("videoPlan.audio.voiceoverFile is missing or not a string");
  }

  if (!Array.isArray(plan.subtitles)) {
    throw new Error("videoPlan.subtitles is missing or not an array");
  }

  if (!Array.isArray(plan.scenes) || plan.scenes.length === 0) {
    throw new Error("videoPlan.scenes is missing, not an array, or empty");
  }
  (plan.scenes as unknown[]).forEach((scene, i) => {
    if (typeof scene !== "object" || scene === null) {
      throw new Error(`videoPlan.scenes[${i}] is not an object`);
    }
    const s = scene as Record<string, unknown>;
    for (const key of ["id", "concept_id", "template", "start", "duration", "animation", "props"]) {
      if (!(key in s)) throw new Error(`videoPlan.scenes[${i}].${key} is missing`);
    }
  });

  return plan as unknown as VideoPlan;
}
