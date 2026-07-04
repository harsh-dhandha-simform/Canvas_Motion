import { useState, useRef, useEffect } from 'react';
import { PlayerRef } from '@remotion/player';
import { Topic, InteractionCue } from '../../shared/videoScriptSchema';

export function usePlayerState() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCue, setActiveCue] = useState<InteractionCue | null>(null);
  const [completedCues, setCompletedCues] = useState<Set<string>>(new Set());

  const playerRef = useRef<PlayerRef>(null);

  const loadTopic = (newTopic: Topic) => {
    setTopic(newTopic);
    setCurrentTimeSec(0);
    setActiveCue(null);
    setCompletedCues(new Set());
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.pause();
    }
  };

  const completeInteraction = () => {
    if (activeCue) {
      const newCompleted = new Set(completedCues);
      newCompleted.add(activeCue.id);
      setCompletedCues(newCompleted);
      setActiveCue(null);
      
      // Resume playback after slight delay for visual transition
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.play();
        }
      }, 500);
    }
  };

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // Listen to play/pause state
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Listen to time updates to trigger interaction cues
    const handleFrameUpdate = (e: any) => {
      if (!topic) return;
      const frame = e.detail.frame;
      const timeSec = frame / 30.0;
      setCurrentTimeSec(timeSec);

      // Look for a cue that should trigger
      const currentCues = topic.interactionCues || [];
      const triggered = currentCues.find((cue) => {
        // Trigger if player hits/passes trigger time AND it has not been completed yet in this session
        return (
          Math.abs(timeSec - cue.triggerAtSec) <= 0.15 &&
          !completedCues.has(cue.id)
        );
      });

      if (triggered && activeCue?.id !== triggered.id) {
        player.pause();
        setActiveCue(triggered);
      }
    };

    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('frameupdate', handleFrameUpdate);

    return () => {
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('frameupdate', handleFrameUpdate);
    };
  }, [topic, completedCues, activeCue]);

  return {
    topic,
    currentTimeSec,
    isPlaying,
    activeCue,
    playerRef,
    loadTopic,
    completeInteraction,
  };
}
