// Deliberately has ZERO imports (not even from @revideo/*). render.ts (plain
// CommonJS, run directly via `node`) needs RENDER_FPS, but importing it straight
// from project.tsx would pull the whole Revideo project graph into Node's native
// module loader — that graph is only meant to be loaded through Vite's transform
// pipeline, and doing it via plain `require()` crashes with
// ERR_UNSUPPORTED_DIR_IMPORT on @revideo/2d's internal directory imports.
export const RENDER_FPS = 30;

// Supersampling factor. Revideo's ffmpeg exporter renders each frame at
// (size * RENDER_SCALE) and encodes at that resolution — there's no separate
// downscale, so RENDER_SCALE=2 means a 1920x1080 plan is delivered as crisp
// 3840x2160. Cost is steep though: the ffmpeg exporter ships each frame to the
// server as a PNG over a websocket (much slower than the native WebCodecs path),
// and 4K roughly quadruples that per-frame cost on top — an 88s video went past
// 13 minutes and risked the 900s render timeout. Left at 1 (native 1080p) for
// throughput when generating many videos; bump to 1.5-2 only for a one-off you
// want maximally crisp and can afford to wait for.
export const RENDER_SCALE = 1;
