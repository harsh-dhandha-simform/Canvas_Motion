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
    </>
  );
};
