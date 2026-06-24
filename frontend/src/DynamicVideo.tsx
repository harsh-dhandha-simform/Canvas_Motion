import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { ThemeProvider, Theme } from "./ThemeContext";
import { COMPONENT_REGISTRY, SceneType } from "./registry";

// ---------------------------------------------------------------------------
// Types (mirrors shared/videoScriptSchema.ts — kept local to avoid build deps)
// ---------------------------------------------------------------------------

type TransitionType = "fade" | "slideLeft" | "slideUp" | "zoom" | "none";

type SceneSpec = {
  id: string;
  type: string;
  duration_frames: number;
  transition: TransitionType;
  data: Record<string, unknown>;
};

export type VideoScriptProps = {
  title: string;
  fps: number;
  width: number;
  height: number;
  theme: Theme;
  scenes: SceneSpec[];
};

// ---------------------------------------------------------------------------
// Transition overlay — 15-frame effect rendered on top of the outgoing scene
// ---------------------------------------------------------------------------

const TransitionOverlay: React.FC<{
  transition: TransitionType;
  durationFrames: number;
}> = ({ transition, durationFrames }) => {
  const frame = useCurrentFrame();

  if (transition === "none") return null;

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (transition === "fade") {
    const opacity = interpolate(frame, [0, durationFrames / 2, durationFrames], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{ backgroundColor: "#000000", opacity, pointerEvents: "none" }}
      />
    );
  }

  if (transition === "slideLeft") {
    const translateX = interpolate(progress, [0, 1], [0, -100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          opacity: 0.6,
          transform: `translateX(${translateX}%)`,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (transition === "slideUp") {
    const translateY = interpolate(progress, [0, 1], [0, -100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          opacity: 0.6,
          transform: `translateY(${translateY}%)`,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (transition === "zoom") {
    const scale = interpolate(progress, [0, 1], [1, 1.08], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(frame, [0, durationFrames / 2, durationFrames], [0, 0.5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          opacity,
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      />
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Scene wrapper — renders one scene component inside an AbsoluteFill
// ---------------------------------------------------------------------------

const TRANSITION_FRAMES = 15;

const SceneWrapper: React.FC<{
  scene: SceneSpec;
  background: string;
}> = ({ scene, background }) => {
  const Component = COMPONENT_REGISTRY[scene.type as SceneType];

  if (!Component) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "#ef4444", fontSize: 24 }}>
          Unknown scene type: {scene.type}
        </span>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        {/* @ts-expect-error — component props come from JSON, validated at backend */}
        <Component {...scene.data} />
      </AbsoluteFill>

      {/* Transition overlay drawn on top */}
      {scene.transition !== "none" && (
        <Sequence
          from={scene.duration_frames - TRANSITION_FRAMES}
          durationInFrames={TRANSITION_FRAMES}
          layout="none"
        >
          <TransitionOverlay
            transition={scene.transition}
            durationFrames={TRANSITION_FRAMES}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// DynamicVideo — the top-level composition driven by the JSON script
// ---------------------------------------------------------------------------

export const DynamicVideo: React.FC<VideoScriptProps> = ({
  theme,
  scenes,
}) => {
  // Calculate cumulative start frames for each scene
  let cursor = 0;
  const positioned = scenes.map((scene) => {
    const from = cursor;
    cursor += scene.duration_frames;
    return { scene, from };
  });

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.background }}>
        {positioned.map(({ scene, from }) => (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.duration_frames}
            premountFor={30}
          >
            <SceneWrapper scene={scene} background={theme.background} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
