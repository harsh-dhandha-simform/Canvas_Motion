// Maps a plan scene's `template` string to its rendering function. This — plus
// project.ts — is the only place that needs to change when a new template is added.
import { Node as RNode } from "@revideo/2d";
import { ThreadGenerator } from "@revideo/core";
import { BulletListScene } from "./scenes/BulletListScene";
import { ChartScene } from "./scenes/ChartScene";
import { CodeScene } from "./scenes/CodeScene";
import { ComparisonScene } from "./scenes/ComparisonScene";
import { DefinitionScene } from "./scenes/DefinitionScene";
import { DiagramScene } from "./scenes/DiagramScene";
import { OutroScene } from "./scenes/OutroScene";
import { QuizScene } from "./scenes/QuizScene";
import { RecapScene } from "./scenes/RecapScene";
import { TitleScene } from "./scenes/TitleScene";
import { DesignTokens } from "./styles/designSystem";
import { Template } from "./types";

export type SceneRenderer = (
  container: RNode,
  tokens: DesignTokens,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  width: number,
  height: number,
  duration: number,
) => ThreadGenerator;

export const TEMPLATE_REGISTRY: Record<Template, SceneRenderer> = {
  TitleScene,
  DefinitionScene,
  BulletListScene,
  DiagramScene,
  CodeScene,
  ComparisonScene,
  ChartScene,
  QuizScene,
  RecapScene,
  OutroScene,
};
