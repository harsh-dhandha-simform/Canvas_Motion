/**
 * Root.tsx — Remotion entry point.
 * 
 * Maps all scripts found in `generated/examples.generated.ts` into individual
 * Remotion `<Composition>`s. This allows previewing and rendering any generated
 * script in the Remotion studio without code changes.
 */
import "./index.css";
import { Composition } from "remotion";
import { DynamicVideo, VideoScriptProps } from "./DynamicVideo";
import { EXAMPLE_SCRIPTS } from "./generated/examples.generated";
import { SortingVisualizer } from "./components/SortingVisualizer";
import { LinearStructure } from "./components/LinearStructure";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {Object.entries(EXAMPLE_SCRIPTS).map(([slug, script]) => {
        const totalFrames = script.scenes.reduce(
          (sum, s) => sum + s.duration_frames,
          0
        );
        return (
          <Composition
            key={slug}
            id={slug}
            component={DynamicVideo}
            durationInFrames={totalFrames}
            fps={script.fps}
            width={script.width}
            height={script.height}
            defaultProps={script as VideoScriptProps}
          />
        );
      })}

      <Composition
        id="preview-SortingVisualizer"
        component={SortingVisualizer}
        durationInFrames={30 * 15}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Bubble sort",
          algorithm: "bubble" as const,
          values: [8, 3, 5, 1, 7, 2, 6, 4],
          showComparisonCounter: true,
        }}
      />

      <Composition
        id="preview-LinearStructure"
        component={LinearStructure}
        durationInFrames={30 * 12}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Queue: enqueue / dequeue",
          kind: "queue" as const,
          initial: [1, 2, 3],
          operations: [
            { op: "enqueue" as const, value: 4 },
            { op: "enqueue" as const, value: 5 },
            { op: "dequeue" as const },
            { op: "dequeue" as const },
          ],
          showHeadTail: true,
        }}
      />
    </>
  );
};
