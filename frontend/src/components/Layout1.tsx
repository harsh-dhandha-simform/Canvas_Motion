import { useMemo } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '../DynamicVideo';
import { Topic, Course, InteractionCue } from '../../../shared/videoScriptSchema';
import QuizInteraction from './interactions/QuizInteraction';
import SendRequestInteraction from './interactions/SendRequestInteraction';
import SimulateMutationInteraction from './interactions/SimulateMutationInteraction';

interface Layout1Props {
  topic: Topic;
  course: Course;
  playerRef: any;
  currentTimeSec: number;
  activeCue: InteractionCue | null;
  completeInteraction: () => void;
  onLoadTopic: (topic: Topic) => void;
  onBackToGenerate: () => void;
}

export default function Layout1({
  topic,
  course,
  playerRef,
  currentTimeSec,
  activeCue,
  completeInteraction,
  onLoadTopic,
  onBackToGenerate,
}: Layout1Props) {
  const scenes = topic.videoScript.scenes || [];
  const totalFrames = useMemo(() => scenes.reduce((sum, s) => sum + s.duration_frames, 0), [scenes]);

  // Compute scene timing boundaries to highlight active transcript
  const sceneTimeRanges = useMemo(() => {
    let currentFrame = 0;
    return scenes.map((scene) => {
      const startSec = currentFrame / 30.0;
      const endSec = (currentFrame + scene.duration_frames) / 30.0;
      const startFrame = currentFrame;
      currentFrame += scene.duration_frames;
      return { id: scene.id, title: scene.title, narration: scene.narration, startSec, endSec, startFrame };
    });
  }, [scenes]);

  const activeSceneIdx = useMemo(() => {
    return sceneTimeRanges.findIndex(
      (range) => currentTimeSec >= range.startSec && currentTimeSec < range.endSec
    );
  }, [sceneTimeRanges, currentTimeSec]);

  const handleTranscriptClick = (startFrame: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startFrame);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0b0f19', color: '#f3f4f6', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Top Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>
            Canvas Motion Player
          </h1>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>|</span>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#d1d5db' }}>{topic.title}</span>
        </div>
        <button
          onClick={onBackToGenerate}
          style={{ padding: '6px 12px', border: '1px solid #374151', borderRadius: '4px', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          Generate New Module
        </button>
      </header>

      {/* Main split viewport */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
        
        {/* Left Video Area (~60% width) */}
        <div style={{ flex: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', padding: '16px', position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: '1024px', maxHeight: '576px', aspectRatio: '16/9', border: '1px solid #1f2937', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <Player
              ref={playerRef}
              component={DynamicVideo}
              durationInFrames={totalFrames}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: '100%', height: '100%' }}
              inputProps={topic.videoScript as any}
              controls
            />
          </div>
        </div>

        {/* Right Side Interaction Panel (~40% width) */}
        <div style={{ flex: 4, borderLeft: '1px solid #1f2937', backgroundColor: '#0f172a', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {activeCue ? (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {activeCue.type === 'quiz' && (
                <QuizInteraction
                  question={activeCue.payload.question}
                  options={activeCue.payload.options}
                  correctAnswer={activeCue.payload.correctAnswer}
                  explanation={activeCue.payload.explanation}
                  onComplete={completeInteraction}
                />
              )}
              {activeCue.type === 'send_request' && (
                <SendRequestInteraction
                  endpoint={activeCue.payload.endpoint}
                  method={activeCue.payload.method}
                  explanation={activeCue.payload.explanation}
                  onComplete={completeInteraction}
                />
              )}
              {activeCue.type === 'simulate_mutation' && (
                <SimulateMutationInteraction
                  variable={activeCue.payload.variable}
                  oldValue={activeCue.payload.oldValue}
                  newValue={activeCue.payload.newValue}
                  explanation={activeCue.payload.explanation}
                  onComplete={completeInteraction}
                />
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lesson Outline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scenes.map((scene, idx) => {
                  const isActive = idx === activeSceneIdx;
                  return (
                    <div
                      key={scene.id}
                      onClick={() => handleTranscriptClick(sceneTimeRanges[idx].startFrame)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: isActive ? '1px solid #7c3aed' : '1px solid #1f2937',
                        backgroundColor: isActive ? 'rgba(124, 58, 237, 0.05)' : 'rgba(255,255,255,0.02)',
                        color: isActive ? '#fff' : '#9ca3af',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal' }}>
                          {idx + 1}. {scene.title}
                        </span>
                        <span style={{ fontSize: '12px' }}>
                          {Math.round(scene.duration_frames / 30)}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Transcript & Navigation */}
      <footer style={{ height: '100px', backgroundColor: '#111827', borderTop: '1px solid #1f2937', display: 'flex', overflow: 'hidden' }}>
        {/* Left bottom: Navigation topics */}
        <div style={{ flex: 3, borderRight: '1px solid #1f2937', padding: '12px 20px', overflowY: 'auto' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 'bold' }}>
            Course Outline
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            {course.chapters.map((chap) =>
              chap.topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onLoadTopic(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: t.id === topic.id ? '1px solid #7c3aed' : '1px solid #374151',
                    backgroundColor: t.id === topic.id ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                    color: t.id === topic.id ? '#a78bfa' : '#9ca3af',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right bottom: Sync Transcript */}
        <div style={{ flex: 7, padding: '16px 24px', overflowY: 'auto', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sceneTimeRanges.map((range, idx) => {
              const isActive = idx === activeSceneIdx;
              return (
                <span
                  key={range.id}
                  onClick={() => handleTranscriptClick(range.startFrame)}
                  style={{
                    color: isActive ? '#38bdf8' : '#6b7280',
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                >
                  {range.narration}
                </span>
              );
            })}
          </div>
        </div>
      </footer>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
