import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThemeProvider, Theme, useTheme } from "./ThemeContext";
import { COMPONENT_REGISTRY, SceneType } from "./registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransitionType = "fade" | "slideLeft" | "slideUp" | "zoom" | "none";

type Panel = {
  area: string;
  type: string;
  data: Record<string, unknown>;
};

type SceneSpec = {
  id: string;
  layout?: string;
  title?: string;
  subtitle?: string;
  duration_frames: number;
  transition: TransitionType;
  panels?: Panel[];
  // Legacy single-component format (old JSON files)
  type?: string;
  data?: Record<string, unknown>;
};

/** Normalise both old {type,data} and new {layout,panels[]} scene shapes. */
function normaliseScene(
  scene: SceneSpec,
): Required<Pick<SceneSpec, "layout" | "title" | "panels">> {
  if (scene.panels && scene.panels.length > 0) {
    return {
      layout: scene.layout ?? "full",
      title: scene.title ?? "",
      panels: scene.panels,
    };
  }
  // Legacy: wrap the single component into a full-layout panel
  return {
    layout: "full",
    title: scene.title ?? "",
    panels: [
      {
        area: "panel",
        type: scene.type ?? "BulletList",
        data: scene.data ?? {},
      },
    ],
  };
}

export type VideoScriptProps = {
  title: string;
  fps: number;
  width: number;
  height: number;
  theme: Theme;
  scenes: SceneSpec[];
};

// ---------------------------------------------------------------------------
// Layout system
// ---------------------------------------------------------------------------

const HEADER_H = 148; // px, for title-* layouts
const CONTENT_H = 1080 - HEADER_H;

type LayoutConfig = {
  hasHeader: boolean;
  gridTemplateAreas: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
};

const LAYOUTS: Record<string, LayoutConfig> = {
  full: {
    hasHeader: false,
    gridTemplateAreas: '"panel"',
    gridTemplateColumns: "1fr",
    gridTemplateRows: "1fr",
  },
  "left-right": {
    hasHeader: false,
    gridTemplateAreas: '"left right"',
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr",
  },
  "title-content": {
    hasHeader: true,
    gridTemplateAreas: '"main"',
    gridTemplateColumns: "1fr",
    gridTemplateRows: "1fr",
  },
  "title-left-right": {
    hasHeader: true,
    gridTemplateAreas: '"left right"',
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr",
  },
  "title-main-sidebar": {
    hasHeader: true,
    gridTemplateAreas: '"main sidebar"',
    gridTemplateColumns: "1.85fr 1fr",
    gridTemplateRows: "1fr",
  },
};

// ---------------------------------------------------------------------------
// Scene header bar (rendered by DynamicVideo for title-* layouts)
// ---------------------------------------------------------------------------

const SceneHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const theme = useTheme();

  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 18], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineScaleX = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        height: HEADER_H,
        padding: "0 72px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
        background: `linear-gradient(135deg, ${theme.background} 60%, ${theme.primary}18 100%)`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Accent bar */}
        <div
          style={{
            width: 5,
            height: 44,
            borderRadius: 3,
            background: `linear-gradient(180deg, ${theme.primary}, ${theme.accent})`,
            flexShrink: 0,
            transformOrigin: "top",
            transform: `scaleY(${lineScaleX})`,
          }}
        />
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 46,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              fontFamily: "inherit",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 22,
                color: "rgba(255,255,255,0.55)",
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Panel renderer — wraps one component in its grid area
// ---------------------------------------------------------------------------

const PanelCell: React.FC<{ panel: Panel; gridArea: string }> = ({
  panel,
  gridArea,
}) => {
  const Component = COMPONENT_REGISTRY[panel.type as SceneType];

  const safeProps = Object.fromEntries(
    Object.entries(panel.data).map(([k, v]: [string, unknown]) => [
      k,
      v === null ? undefined : v,
    ]),
  ) as Record<string, unknown>;

  if (!Component) {
    return (
      <div
        style={{
          gridArea,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #ef4444",
        }}
      >
        <span style={{ color: "#ef4444", fontSize: 20 }}>
          Unknown: {panel.type}
        </span>
      </div>
    );
  }

  const AnyComponent = Component as React.FC<Record<string, unknown>>;

  return (
    <div style={{ gridArea, position: "relative", overflow: "hidden" }}>
      <AnyComponent {...safeProps} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// SceneWrapper — renders header + grid of panels + transition overlay
// ---------------------------------------------------------------------------

const TRANSITION_FRAMES = 15;

const SceneWrapper: React.FC<{ scene: SceneSpec; background: string }> = ({
  scene,
  background,
}) => {
  const { layout, title, panels } = normaliseScene(scene);
  const config = LAYOUTS[layout] ?? LAYOUTS["full"];
  const contentH = config.hasHeader ? CONTENT_H : 1080;

  return (
    <AbsoluteFill
      style={{ backgroundColor: background, flexDirection: "column" }}
    >
      {/* Header bar */}
      {config.hasHeader && (
        <SceneHeader title={title} subtitle={scene.subtitle} />
      )}

      {/* Content grid */}
      <div
        style={{
          flex: 1,
          height: contentH,
          display: "grid",
          gridTemplateAreas: config.gridTemplateAreas,
          gridTemplateColumns: config.gridTemplateColumns,
          gridTemplateRows: config.gridTemplateRows,
          gap: 0,
        }}
      >
        {panels.map((panel) => (
          <PanelCell key={panel.area} panel={panel} gridArea={panel.area} />
        ))}
      </div>

      {/* Transition overlay */}
      {scene.transition !== "none" && (
        <Sequence
          from={scene.duration_frames - TRANSITION_FRAMES}
          durationInFrames={TRANSITION_FRAMES}
          layout="none"
        >
          <TransitionOverlay transition={scene.transition} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Transition overlay
// ---------------------------------------------------------------------------

const TransitionOverlay: React.FC<{ transition: TransitionType }> = ({
  transition,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 300 },
    durationInFrames: TRANSITION_FRAMES,
  });

  const fadeOpacity = interpolate(
    frame,
    [0, TRANSITION_FRAMES / 2, TRANSITION_FRAMES],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  if (transition === "fade") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: fadeOpacity,
          pointerEvents: "none",
        }}
      />
    );
  }
  if (transition === "slideLeft") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: 0.7,
          transform: `translateX(${interpolate(progress, [0, 1], [0, -100])}%)`,
          pointerEvents: "none",
        }}
      />
    );
  }
  if (transition === "slideUp") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: 0.7,
          transform: `translateY(${interpolate(progress, [0, 1], [0, -100])}%)`,
          pointerEvents: "none",
        }}
      />
    );
  }
  if (transition === "zoom") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: fadeOpacity * 0.6,
          transform: `scale(${interpolate(progress, [0, 1], [1, 1.08])})`,
          pointerEvents: "none",
        }}
      />
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// DynamicVideo — top-level composition
// ---------------------------------------------------------------------------

export const DynamicVideo: React.FC<VideoScriptProps> = ({ theme, scenes }) => {
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
            style={{
              translate: "-23.8px -15.1px",
            }}
          >
            <SceneWrapper scene={scene} background={theme.background} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
