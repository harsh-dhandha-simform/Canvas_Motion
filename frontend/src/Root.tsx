import "./index.css";
import { Composition } from "remotion";
import { GeneratedVideo } from "./generated/GeneratedVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GeneratedVideo"
        component={GeneratedVideo}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
