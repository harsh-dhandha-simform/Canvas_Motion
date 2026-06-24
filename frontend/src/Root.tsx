import "./index.css";
import { Composition } from "remotion";
import { GeneratedVideo } from "./generated/GeneratedVideo";
import { ScalingScene } from "./scenes/ScalingScene";
import { DynamicVideo, VideoScriptProps } from "./DynamicVideo";
import demoScript from "../../shared/examples/demo.json";

export const RemotionRoot: React.FC = () => {
  const script = demoScript as VideoScriptProps;
  const totalFrames = script.scenes.reduce(
    (sum, s) => sum + s.duration_frames,
    0
  );

  return (
    <>
      <Composition
        id="DynamicVideo"
        component={DynamicVideo}
        durationInFrames={totalFrames}
        fps={script.fps}
        width={script.width}
        height={script.height}
        defaultProps={script}
      />
      <Composition
        id="GeneratedVideo"
        component={GeneratedVideo}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ScalingScene"
        component={ScalingScene}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
