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

      {/* Fallback for stale browser URLs from before the refactor */}
      {EXAMPLE_SCRIPTS["scaling"] && (
        <Composition
          id="DynamicVideo"
          component={DynamicVideo}
          durationInFrames={EXAMPLE_SCRIPTS["scaling"].scenes.reduce((sum, s) => sum + s.duration_frames, 0)}
          fps={EXAMPLE_SCRIPTS["scaling"].fps}
          width={EXAMPLE_SCRIPTS["scaling"].width}
          height={EXAMPLE_SCRIPTS["scaling"].height}
          defaultProps={EXAMPLE_SCRIPTS["scaling"] as VideoScriptProps}
        />
      )}
    </>
  );
};
