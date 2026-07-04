// Mirrors app/schemas/concepts.py (Concepts) and app/schemas/interactions.py
// (Interactions) — the AI<->player boundary (MASTER_CONTEXT.md §6.2, §6.3). Keep in
// sync: any change to the Pydantic models must be mirrored here in the same phase.
// No player logic yet — types only (Phase 2).

export interface ConceptWindow {
  id: string;
  title: string;
  order: number;
  description: string;
  start: number;
  end: number;
}

export interface Concepts {
  concepts: ConceptWindow[];
  totalDurationSec: number;
}

export type InteractionType =
  | "step_through"
  | "code_playground"
  | "param_explorer"
  | "diagram_explore"
  | "quiz"
  | "data_structure"
  | "flashcards"
  | "custom";

export interface StepThroughStep {
  label: string;
  detail: string;
}

export interface StepThroughProps {
  steps: StepThroughStep[];
}

export interface CodePlaygroundProps {
  language: string;
  initialCode: string;
  expectedOutput?: string;
}

export interface ParamExplorerParam {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ParamExplorerProps {
  params: ParamExplorerParam[];
  visualization: string;
}

export interface QuizWidgetProps {
  question: string;
  options: string[];
  answer: string;
}

export interface DataStructureProps {
  structureType: string;
  initialState: Record<string, unknown>;
}

export interface FlashcardsCard {
  front: string;
  back: string;
}

export interface FlashcardsProps {
  cards: FlashcardsCard[];
}

export type InteractionProps =
  | StepThroughProps
  | CodePlaygroundProps
  | ParamExplorerProps
  | QuizWidgetProps
  | DataStructureProps
  | FlashcardsProps
  | Record<string, unknown>; // diagram_explore reuses renderer DiagramProps

export interface CustomCode {
  entry: string;
  code: string;
}

export interface Interaction {
  concept_id: string;
  type: InteractionType;
  title: string;
  props: InteractionProps;
  custom?: CustomCode;
}

export interface Interactions {
  interactions: Interaction[];
}
