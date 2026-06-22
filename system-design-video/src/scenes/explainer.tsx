import {makeScene2D, Txt, Rect, Audio} from '@revideo/2d';
import {createRef, useScene, waitFor, all, chain} from '@revideo/core';


export default makeScene2D('explainer', function* (view) {
  // Read variables passed in at render time, with safe defaults
  const title = useScene().variables.get('title', 'System Design')();
  const slides = useScene().variables.get('slides', [
    {heading: 'Default heading', body: 'Default body text.'},
  ])();

  view.fill('#0f172a'); // dark navy background
  yield view.add(
    <Audio src={'silence.mp3'} play={true} />,
  );
  // Audio element removed to fix ffmpeg duration error
  // Add audio file directly to renderVideo settings or use a local audio file if needed

  // --- Title card ---
  const titleRef = createRef<Txt>();
  view.add(
    <Txt
      ref={titleRef}
      text={title}
      fontSize={120}
      fontWeight={700}
      fill={'#ffffff'}
      opacity={0}
    />,
  );
  yield* titleRef().opacity(1, 1);
  yield* waitFor(1.5);
  yield* titleRef().opacity(0, 0.8);
  titleRef().remove();

  // --- Loop through each slide ---
  for (const slide of slides) {
    const headingRef = createRef<Txt>();
    const bodyRef = createRef<Txt>();

    view.add(
      <Rect direction={'column'} gap={40} width={'80%'} layout>
        <Txt
          ref={headingRef}
          text={slide.heading}
          fontSize={70}
          fontWeight={700}
          fill={'#38bdf8'}
          opacity={0}
        />
        <Txt
          ref={bodyRef}
          text={slide.body}
          fontSize={42}
          fill={'#e2e8f0'}
          textWrap={true}
          opacity={0}
        />
      </Rect>,
    );

    yield* all(headingRef().opacity(1, 0.6), bodyRef().opacity(1, 0.6));
    yield* waitFor(3); // time each slide stays on screen
    yield* all(headingRef().opacity(0, 0.5), bodyRef().opacity(0, 0.5));

    headingRef().remove();
    bodyRef().remove();
    // headingRef().parent()?.remove();
  }

  // Explicit end - ensures duration is calculable
  yield* waitFor(1);
});