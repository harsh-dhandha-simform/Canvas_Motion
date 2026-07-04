// Local render entry (Phase 9 deliverable #11). Reads video_plan.json + voiceover.mp3
// from a job dir, renders the plan, and writes rendered.mp4 back into that same job
// dir. This is the only Node-side script invoked as compiled CommonJS (`tsc && node
// dist/render.js`) — project.tsx itself is loaded by Vite inside headless Chromium,
// not compiled here.
//
// MUST be run with cwd = this renderer/ directory (as `npm run render` already
// does). renderVideo() resolves `projectFile` via `path.join(process.cwd(),
// projectFile)` — NOT `path.resolve`, so an absolute projectFile silently produces
// a broken doubled path — and Vite's `publicDir` default is `<cwd>/public`. Both
// are cwd-relative, not __dirname-relative (this script runs compiled from dist/).
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { renderVideo } from "@revideo/renderer";
import { RENDER_FPS } from "./src/renderConfig";
import { assertVideoPlan } from "./src/types";

async function main(): Promise<void> {
  const jobDir = process.argv[2];
  if (!jobDir) {
    console.error("Usage: node dist/render.js <jobDir>");
    process.exit(1);
  }

  const planPath = path.join(jobDir, "video_plan.json");
  const voiceoverPath = path.join(jobDir, "voiceover.mp3");
  const plan = assertVideoPlan(JSON.parse(fs.readFileSync(planPath, "utf-8")));

  // fps can't be overridden per-render (see project.tsx) — fail loudly rather than
  // silently rendering at RENDER_FPS while video_plan.json claims something else.
  if (plan.video.fps !== RENDER_FPS) {
    throw new Error(
      `video_plan.json requests fps=${plan.video.fps}, but this renderer is fixed at ` +
        `${RENDER_FPS}fps (Revideo has no per-render fps override — see RENDER_FPS in ` +
        `src/project.tsx). Change config.yaml's video.fps back to ${RENDER_FPS}, or edit ` +
        `RENDER_FPS in src/project.tsx to match and re-render.`,
    );
  }

  // Give each render its own unique served audio name (public/ is shared across
  // every render this process — or a concurrent one — ever does, so a fixed name
  // would let two overlapping renders clobber each other's audio).
  const audioId = `${path.basename(jobDir)}-${crypto.randomBytes(4).toString("hex")}`;

  // Revideo resolves the SAME audio URL two different ways, and the physical file
  // must exist in BOTH places or the final video gets a silent track:
  //   1. Browser playback  → Vite serves it from its publicDir = <cwd>/public
  //      (= renderer/public). This is what drives per-frame audio asset tracking.
  //   2. Server-side ffmpeg mux → @revideo/ffmpeg's resolvePath() computes
  //      path.join(outDir, '../public', url) = <jobDir>/../public (= jobs/public).
  //      If the file isn't there, ffprobe fails and mergeMedia falls back to a
  //      visuals-only (silent) copy — the exact silent-voiceover bug we hit.
  const browserPublicDir = path.join(process.cwd(), "public"); // renderer/public (Vite)
  const serverPublicDir = path.join(jobDir, "..", "public"); // jobs/public (ffmpeg mux)
  fs.mkdirSync(browserPublicDir, { recursive: true });
  fs.mkdirSync(serverPublicDir, { recursive: true });
  const browserAudioPath = path.join(browserPublicDir, `${audioId}.mp3`);
  const serverAudioPath = path.join(serverPublicDir, `${audioId}.mp3`);
  fs.copyFileSync(voiceoverPath, browserAudioPath);
  fs.copyFileSync(voiceoverPath, serverAudioPath);

  try {
    console.log(`Rendering ${planPath} (${plan.scenes.length} scenes, ${plan.video.durationSec}s)...`);
    const outputPath = await renderVideo({
      projectFile: "./src/project.tsx",
      variables: { videoPlan: plan, audioUrl: `/${audioId}.mp3` },
      settings: {
        outFile: "rendered.mp4",
        outDir: jobDir,
        logProgress: true,
        projectSettings: {
          size: { x: plan.video.width, y: plan.video.height },
          background: plan.video.style.backgroundColor,
          range: [0, plan.video.durationSec],
          // Revideo's project-level default exporter is '@revideo/core/wasm'
          // (mp4-wasm's WebCodecs encoder), which builds its encoder straight from
          // `settings.size` and IGNORES resolutionScale entirely — every render was
          // silently stuck at 1x (and WebCodecs' low default bitrate) regardless of
          // RENDER_SCALE in project.tsx. Pinning the ffmpeg exporter (server-side
          // libx264, image2pipe) here is what actually makes resolutionScale (and a
          // sane bitrate) take effect; it's also the exporter that expects the
          // audio.wav our voiceover mux depends on.
          exporter: { name: "@revideo/core/ffmpeg", options: { format: "mp4" } },
        },
        // Headless Chrome's own OS-level sandbox needs privileges most containerized
        // backends (Docker, CI, root-run sandboxes) don't grant; this is the standard
        // accommodation, not a reduction of what this renderer trusts (it only ever
        // loads our own scene code, never arbitrary/untrusted script).
        puppeteer: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
      },
    });
    console.log(`Rendered video to ${outputPath}`);
  } finally {
    // Don't let public/ accumulate one audio file per video generated forever.
    fs.rmSync(browserAudioPath, { force: true });
    fs.rmSync(serverAudioPath, { force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
