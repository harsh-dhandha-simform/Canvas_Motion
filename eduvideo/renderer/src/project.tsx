// The entrypoint (Phase 9 deliverable #10). Reads the VideoPlan from renderVideo's
// `variables`, builds a single continuous timeline: for each plan scene, mounts the
// registered template for its `duration` window with the scene's `animation` preset
// as entrance/exit, attaches `<Audio>` = voiceover.mp3, and overlays subtitles as a
// global layer running in parallel with the scene sequence.
import { Audio, Layout, makeScene2D, Rect } from "@revideo/2d";
import { all, createRef, makeProject, ThreadGenerator, useScene, waitFor } from "@revideo/core";
import { SceneBackdrop } from "./components/SceneBackdrop";
import { playSubtitles, SubtitleBox } from "./components/SubtitleBox";
import { RENDER_FPS, RENDER_SCALE } from "./renderConfig";
import { getDesignTokens, playEntrance, playExit } from "./styles/designSystem";
import { TEMPLATE_REGISTRY } from "./templateRegistry";
import { assertVideoPlan } from "./types";

const ENTRANCE_DURATION = 0.4;
const EXIT_DURATION = 0.3;

const main = makeScene2D("main", function* (view) {
  const planData = useScene().variables.get("videoPlan", null)();
  const plan = assertVideoPlan(planData);
  // Unique per-render served path (see render.ts) — never a fixed "/voiceover.mp3",
  // so concurrent renders can't clobber each other's audio in the shared public/ dir.
  const audioUrl = useScene().variables.get("audioUrl", "/voiceover.mp3")();

  const tokens = getDesignTokens(plan.video.style);
  const width = plan.video.width;
  const height = plan.video.height;

  view.fill(tokens.colors.background);
  // Persistent decorative backdrop behind every scene (gradient + glows + vignette).
  view.add(SceneBackdrop(tokens, width, height));
  view.add(<Audio src={audioUrl} play={true} />);

  // Subtitles ride on top of every scene (zIndex above the dynamically-mounted
  // scene containers, which default to zIndex 0).
  const subtitleContainer = createRef<Rect>();
  const subtitleWords = createRef<Layout>();
  view.add(SubtitleBox(tokens, height / 2 - 96, subtitleContainer, subtitleWords));

  function* playScenes(): ThreadGenerator {
    for (const scene of plan.scenes) {
      const containerRef = createRef<Layout>();
      view.add(<Layout ref={containerRef} width={width} height={height} />);
      const container = containerRef();

      const entranceDur = Math.min(ENTRANCE_DURATION, scene.duration / 3);
      const exitDur = Math.min(EXIT_DURATION, scene.duration / 3);
      const holdDur = Math.max(scene.duration - entranceDur - exitDur, 0);

      const renderFn = TEMPLATE_REGISTRY[scene.template];
      if (!renderFn) {
        throw new Error(`No renderer registered for template '${scene.template}' (scene '${scene.id}')`);
      }

      yield* playEntrance(container, scene.animation, entranceDur);
      yield* renderFn(container, tokens, scene.props, width, height, holdDur);
      yield* playExit(container, scene.animation, exitDur);
      container.remove();
    }
  }

  if (plan.subtitles.length > 0) {
    yield* all(playScenes(), playSubtitles(tokens, subtitleContainer(), subtitleWords(), plan.subtitles));
  } else {
    yield* playScenes();
  }

  yield* waitFor(0.1);
});

// The plan's actual width/height are supplied per-render via renderVideo's
// `settings.projectSettings` (see render.ts). `rendering.fps` is NOT — Revideo's
// `RenderVideoUserProjectSettings` (what renderVideo() actually accepts) has no fps
// field, so the output frame rate is fixed by this static setting for every render
// regardless of a job's video_plan.json. render.ts asserts video.fps matches this
// value before rendering, so a mismatch fails loudly instead of silently producing
// a video mislabeled with the wrong fps (RENDER_FPS lives in ./renderConfig, not
// here, so render.ts can import it without pulling in this whole Revideo module
// graph via Node's native loader — see renderConfig.ts for why that breaks).
export default makeProject({
  scenes: [main],
  settings: {
    shared: { size: { x: 1920, y: 1080 } },
    // resolutionScale supersamples every frame (see RENDER_SCALE in renderConfig) —
    // the one quality knob Revideo exposes, delivering crisp high-res output instead
    // of soft 1080p. render.ts asserts the plan matches RENDER_FPS before rendering.
    rendering: { fps: RENDER_FPS, resolutionScale: RENDER_SCALE },
  },
});
