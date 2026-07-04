import { useState, useEffect } from 'react';
import GenerationView from './components/GenerationView';
import Layout1 from './components/Layout1';
import { usePlayerState } from './usePlayerState';
import { Course, Topic } from '../../shared/videoScriptSchema';
import exampleScript from '../../shared/examples/scaling.json';

// Create a mock Course with our scaling topic as a pre-loaded curated lesson
const mockTopic: Topic = {
  id: 'scaling-basics',
  title: 'Horizontal vs Vertical Scaling',
  videoScript: exampleScript as any,
  interactionCues: [
    {
      id: 'quiz_scaling_1',
      slideIndex: 1,
      triggerAt: 'slide_end',
      concept: 'Vertical Scaling Limit',
      type: 'quiz',
      payload: {
        question: 'Which of the following is a key limitation of vertical scaling (scaling up)?',
        options: [
          'It requires adding more network interfaces.',
          'There is a hard physical hardware limit on a single machine.',
          'It is always cheaper than horizontal scaling.',
          'It does not support relational databases.'
        ],
        correctAnswer: 1,
        explanation: 'Vertical scaling is bounded by the physical capacities (CPU, RAM, Disk) of a single server. Once you reach the maximum hardware limit, you must scale horizontally.'
      },
      triggerAtSec: 8.5
    },
    {
      id: 'req_scaling_1',
      slideIndex: 2,
      triggerAt: 'slide_start',
      concept: 'Routing Client Request',
      type: 'send_request',
      payload: {
        endpoint: 'http://load-balancer/route',
        method: 'POST',
        explanation: 'Simulating routing a client request to the load balancer, which will distribute the load across multiple horizontally scaled hosts.'
      },
      triggerAtSec: 15.0
    }
  ],
  totalDurationSec: exampleScript.scenes.reduce((sum, s) => sum + s.duration_frames, 0) / 30.0
};

const mockCourse: Course = {
  id: 'sys-design-101',
  title: 'System Design Basics',
  chapters: [
    {
      id: 'chap-scaling',
      title: 'Scalability & Replication',
      topics: [mockTopic]
    }
  ]
};

export default function App() {
  const [view, setView] = useState<'generate' | 'player'>('player');
  const [currentCourse, setCurrentCourse] = useState<Course>(mockCourse);
  
  const {
    topic,
    currentTimeSec,
    activeCue,
    playerRef,
    loadTopic,
    completeInteraction,
  } = usePlayerState();

  // Load default mock topic on mount
  useEffect(() => {
    loadTopic(mockTopic);
  }, []);

  const handleTopicGenerated = (generatedTopic: Topic) => {
    // Add the generated topic to our Course outline dynamically
    const updatedCourse = { ...currentCourse };
    updatedCourse.chapters[0].topics.push(generatedTopic);
    setCurrentCourse(updatedCourse);
    
    loadTopic(generatedTopic);
    setView('player');
  };

  return (
    <div>
      {view === 'generate' ? (
        <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GenerationView onGenerationComplete={handleTopicGenerated} />
        </div>
      ) : (
        topic && (
          <Layout1
            topic={topic}
            course={currentCourse}
            playerRef={playerRef}
            currentTimeSec={currentTimeSec}
            activeCue={activeCue}
            completeInteraction={completeInteraction}
            onLoadTopic={loadTopic}
            onBackToGenerate={() => setView('generate')}
          />
        )
      )}
    </div>
  );
}
