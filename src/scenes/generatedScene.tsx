import { makeScene2D } from '@motion-canvas/2d';
import { Rect, Txt, Node, Circle, Line } from '@motion-canvas/2d/components';
import { waitFor } from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  // Set up the background
  view.fill('#0b0f19');

  const narrationBox = (
    <Rect width={2440} height={160} fill={'#1e293b'} radius={16} padding={40} layout>
      <Txt scale={1.2} fill={'white'} />
    </Rect>
  );

  const narrator = narrationBox.children[0];

  const diagram = (
    <Node layout direction={'row'} gap={60} alignItems="center">
      {/* Master Node */}
      <Node layout direction={'column'} alignItems="center" gap={20}>
        <Circle size={120} fill={'#38bdf8'} />
        <Txt fill={'white'}>Master Node</Txt>
      </Node>

      {/* Traffic Arrows */}
      <Node layout gap={20} direction={'row'}>
        <Line stroke={'#10b981'} lineWidth={4} size={[40, 0]} />
        <Line stroke={'#10b981'} lineWidth={4} size={[40, 0]} />
      </Node>

      {/* Worker Nodes */}
    </>
---