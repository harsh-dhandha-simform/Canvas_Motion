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

    </>
  );
};
