import {makeProject} from '@motion-canvas/core';
import generatedScene from './scenes/generatedScene';

export default makeProject({
  scenes: [generatedScene],
  size: {x: 2560, y: 1080},
});
