import {makeProject} from '@revideo/core';
import explainer from './scenes/explainer?scene';

export default makeProject({
  scenes: [explainer],
  variables: {
    title: 'System Design',
    slides: [
      {heading: 'What is System Design?', body: 'Placeholder body text.'},
    ],
  },
  // Explicit video settings to ensure proper duration calculation
  settings: {
    frameRate: 60,
    resolution: [1920, 1080],
  },
});