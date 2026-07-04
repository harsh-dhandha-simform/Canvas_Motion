// Maps an interaction `type` to its widget component (Phase 12 deliverable #6).
// Library widgets receive their typed `props`; `custom` is dispatched to the
// sandboxed iframe host instead. Adding a widget = one entry here.
import { SandboxHost } from "../sandbox/SandboxHost";
import { theme as t } from "../styles/designSystem";
import {
  CodePlaygroundProps,
  DataStructureProps,
  FlashcardsProps,
  Interaction,
  InteractionType,
  ParamExplorerProps,
  QuizWidgetProps,
  StepThroughProps,
} from "../types";
import { CodePlayground } from "./CodePlayground";
import { DataStructure } from "./DataStructure";
import { DiagramExplore } from "./DiagramExplore";
import { DiagramExploreProps } from "./diagramTypes";
import { Flashcards } from "./Flashcards";
import { ParamExplorer } from "./ParamExplorer";
import { Quiz } from "./Quiz";
import { StepThrough } from "./StepThrough";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LIBRARY: Partial<Record<InteractionType, (p: any) => JSX.Element>> = {
  step_through: (p: StepThroughProps) => <StepThrough props={p} />,
  quiz: (p: QuizWidgetProps) => <Quiz props={p} />,
  param_explorer: (p: ParamExplorerProps) => <ParamExplorer props={p} />,
  flashcards: (p: FlashcardsProps) => <Flashcards props={p} />,
  diagram_explore: (p: DiagramExploreProps) => <DiagramExplore props={p} />,
  code_playground: (p: CodePlaygroundProps) => <CodePlayground props={p} />,
  data_structure: (p: DataStructureProps) => <DataStructure props={p} />,
};

export function Widget({ interaction }: { interaction: Interaction }) {
  if (interaction.type === "custom") {
    if (!interaction.custom) return <Unsupported label="custom (missing code)" />;
    return <SandboxHost custom={interaction.custom} />;
  }
  const render = LIBRARY[interaction.type];
  if (!render) return <Unsupported label={interaction.type} />;
  return render(interaction.props);
}

function Unsupported({ label }: { label: string }) {
  return (
    <div style={{ color: t.colors.textMuted, fontStyle: "italic", padding: t.space(2) }}>
      Widget type “{label}” is not available yet.
    </div>
  );
}
