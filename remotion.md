---
name: remotion-best-practices
description: >
  Domain knowledge and best practices for building videos with Remotion (React-based video framework).
  Use this skill whenever you are working with Remotion code — composing scenes, animating elements,
  adding audio, rendering, using sequences, transitions, fonts, GIFs, Lottie, captions, or any other
  Remotion feature. Also use it when scaffolding a new Remotion project, debugging Remotion render
  issues, or integrating Remotion into a larger pipeline. Invoke proactively any time the user mentions
  Remotion, remotion.config.ts, useCurrentFrame, interpolate, Sequence, Composition, or video rendering
  with React, even if they don't say "Remotion" explicitly.
---

## Core rules (always apply)

**Animation** — use `useCurrentFrame()` + `interpolate()`. Never CSS transitions or CSS animations — they don't render correctly in Remotion. Tailwind animation classes are equally forbidden.

```tsx
import { useCurrentFrame, interpolate, Easing } from "remotion";

const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1),
});
```

**Assets** — place files in `public/`, reference with `staticFile()`. Use `<Img>`, `<Video>`, `<Audio>` from `remotion` / `@remotion/media`.

```tsx
import { Img, staticFile } from "remotion";
<Img src={staticFile("logo.png")} />
```

**Sequencing** — use `<Sequence from={n} durationInFrames={n}>` to delay or limit content. Default is `AbsoluteFill`; add `layout="none"` for inline content.

**Compositions** — define width/height/fps/duration in `src/Root.tsx` via `<Composition>`. Use `calculateMetadata` for dynamic duration.

**Preview** — `npx remotion studio`. Single-frame sanity check: `npx remotion still [id] --scale=0.25 --frame=30`.

## New project setup

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
```

## Reference files — load when needed

Each reference covers one topic. Read it only when that topic is relevant — don't load all of them.

| Topic | File | When to load |
|---|---|---|
| Advanced timing & easing | [references/timing.md](references/timing.md) | `interpolate`, Bézier, `spring()`, staggered animations |
| Transitions | [references/transitions.md](references/transitions.md) | Scene-to-scene transitions |
| Text animations | [references/text-animations.md](references/text-animations.md) | Typography, character/word reveal |
| Advanced sequencing | [references/sequencing.md](references/sequencing.md) | Delay, trim, duration limiting patterns |
| Captions / subtitles | [references/subtitles.md](references/subtitles.md) | Display captions synced to audio |
| Display captions | [references/display-captions.md](references/display-captions.md) | Caption rendering component |
| Import SRT | [references/import-srt-captions.md](references/import-srt-captions.md) | Loading .srt files |
| Transcribe captions | [references/transcribe-captions.md](references/transcribe-captions.md) | Whisper/ElevenLabs transcription |
| Audio (advanced) | [references/audio.md](references/audio.md) | Trim, volume, speed, pitch |
| Audio visualization | [references/audio-visualization.md](references/audio-visualization.md) | Spectrum bars, waveforms, bass-reactive |
| Sound effects | [references/sfx.md](references/sfx.md) | Adding SFX |
| Get audio duration | [references/get-audio-duration.md](references/get-audio-duration.md) | Duration in seconds via Mediabunny |
| Get video duration | [references/get-video-duration.md](references/get-video-duration.md) | Duration via Mediabunny |
| Get video dimensions | [references/get-video-dimensions.md](references/get-video-dimensions.md) | Width/height via Mediabunny |
| Advanced videos | [references/videos.md](references/videos.md) | Trim, loop, speed, volume in `<Video>` |
| Transparent videos | [references/transparent-videos.md](references/transparent-videos.md) | Alpha channel rendering |
| Trimming | [references/trimming.md](references/trimming.md) | Cut beginning/end of animations |
| Advanced images | [references/images.md](references/images.md) | Sizing, positioning, dynamic paths |
| GIFs | [references/gifs.md](references/gifs.md) | Synchronized GIF playback |
| Lottie | [references/lottie.md](references/lottie.md) | Embedding Lottie animations |
| 3D / Three.js | [references/3d.md](references/3d.md) | React Three Fiber in Remotion |
| Google Fonts | [references/google-fonts.md](references/google-fonts.md) | Load fonts from Google Fonts |
| Local fonts | [references/local-fonts.md](references/local-fonts.md) | Load fonts from disk |
| TailwindCSS | [references/tailwind.md](references/tailwind.md) | Using Tailwind (static classes only — no animations) |
| Compositions (advanced) | [references/compositions.md](references/compositions.md) | Stills, folders, nested compositions |
| Parameterized videos | [references/parameters.md](references/parameters.md) | Zod schema + props |
| Dynamic metadata | [references/calculate-metadata.md](references/calculate-metadata.md) | Dynamic duration/dimensions/props |
| Measuring DOM nodes | [references/measuring-dom-nodes.md](references/measuring-dom-nodes.md) | Element size measurement |
| Measuring text | [references/measuring-text.md](references/measuring-text.md) | Text dimensions, fit-to-container |
| HTML in canvas | [references/html-in-canvas.md](references/html-in-canvas.md) | `<HtmlInCanvas>` for 2D/WebGL effects |
| Light leaks | [references/light-leaks.md](references/light-leaks.md) | Overlay effects via `@remotion/light-leaks` |
| FFmpeg | [references/ffmpeg.md](references/ffmpeg.md) | FFmpeg operations (trim, detect silence) |
| Silence detection | [references/silence-detection.md](references/silence-detection.md) | Detect/trim silent segments |
| Voiceover | [references/voiceover.md](references/voiceover.md) | ElevenLabs TTS voiceover |
| Maps | [references/maplibre.md](references/maplibre.md) | Animated map routes/flyovers (complex); for simple maps use static images |

## This project's component system

This project (`/home/apurv.panchal@simform.dom/Documents/remotion/my-video`) uses a pipeline that generates multi-panel scene JSON consumed by Remotion. Key conventions:

- **Scenes** use `{layout, panels[], title, subtitle, duration_frames, transition}` format
- **Layouts**: `full`, `left-right`, `title-content`, `title-left-right`, `title-main-sidebar` — defined in `frontend/src/DynamicVideo.tsx`
- **Components** are registered in `frontend/src/registry.ts` and rendered via `DynamicVideo.tsx`
- **New JSON examples** are registered via `npm run register-examples` (runs `frontend/scripts/register-examples.ts`)
- **Theme**: `{primary, secondary, accent, background, font}` passed into `ThemeProvider`
