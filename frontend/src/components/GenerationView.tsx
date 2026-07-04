import React, { useState } from 'react';

export type GenerationStage = {
  id: number;
  label: string;
  description: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  detailText?: string;
};

interface GenerationViewProps {
  onGenerationComplete: (topic: any) => void;
}

export default function GenerationView({ onGenerationComplete }: GenerationViewProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<GenerationStage[]>([
    { id: 1, label: 'Scoping Topic', description: 'Curating subtopics, dependencies and teaching depth...', status: 'pending' },
    { id: 2, label: 'Writing Slides & Scenes', description: 'Generating scripts, layout hints, and structural blueprints...', status: 'pending' },
    { id: 3, label: 'Generating Interactive Checks', description: 'Structuring quizzes, state mutations, and mock APIs...', status: 'pending' },
    { id: 4, label: 'Finalizing Module', description: 'Assembling VideoScript and preparing browser preview...', status: 'pending' },
  ]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setStages([
      { id: 1, label: 'Scoping Topic', description: 'Curating subtopics, dependencies and teaching depth...', status: 'in_progress' },
      { id: 2, label: 'Writing Slides & Scenes', description: 'Generating scripts, layout hints, and structural blueprints...', status: 'pending' },
      { id: 3, label: 'Generating Interactive Checks', description: 'Structuring quizzes, state mutations, and mock APIs...', status: 'pending' },
      { id: 4, label: 'Finalizing Module', description: 'Assembling VideoScript and preparing browser preview...', status: 'pending' },
    ]);

    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration_seconds: duration }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const rawData = line.trim().slice(6);
            const payload = JSON.parse(rawData);

            if (payload.error) {
              throw new Error(payload.error);
            }

            const currentStage = payload.stage;
            const currentStatus = payload.status;

            setStages((prevStages) =>
              prevStages.map((stage) => {
                if (stage.id === currentStage) {
                  let detail = undefined;
                  if (currentStage === 1 && payload.title) {
                    detail = `Scoped Title: "${payload.title}"`;
                  } else if (currentStage === 2 && payload.scene_count) {
                    detail = `Created ${payload.scene_count} scene templates`;
                  } else if (currentStage === 3 && payload.message) {
                    detail = payload.message;
                  }

                  return {
                    ...stage,
                    status: currentStatus === 'complete' ? 'complete' : 'in_progress',
                    detailText: detail || stage.detailText,
                  };
                }
                
                // If previous stage is complete, transition next stage to in_progress if it's currently pending
                if (stage.id < currentStage) {
                  return { ...stage, status: 'complete' };
                }
                if (stage.id === currentStage + 1 && currentStatus === 'complete') {
                  return { ...stage, status: 'in_progress' };
                }
                return stage;
              })
            );

            // Generation completed
            if (currentStage === 3 && currentStatus === 'complete' && payload.topic) {
              // Wait slightly for smooth transition feel
              setTimeout(() => {
                onGenerationComplete(payload.topic);
              }, 1000);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setStages((prevStages) =>
        prevStages.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s))
      );
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', width: '100%', margin: '40px auto', padding: '24px', backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', color: '#f3f4f6' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#7c3aed', textAlign: 'center' }}>
        Create Custom Educational Module
      </h2>
      
      {!isGenerating && !error ? (
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
              What concept would you like to learn today?
            </label>
            <input
              type="text"
              placeholder="e.g. consistent hashing, distributed locks, database indexing..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#fff', fontSize: '16px', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
              Target Length: {duration} seconds
            </label>
            <input
              type="range"
              min="30"
              max="180"
              step="30"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed' }}
            />
          </div>

          <button
            type="submit"
            style={{ padding: '14px', borderRadius: '6px', border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
          >
            Start Generation
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', fontSize: '14px' }}>
              <strong>Error during generation:</strong> {error}
              <button
                onClick={() => { setError(null); setIsGenerating(false); }}
                style={{ marginTop: '8px', display: 'block', padding: '6px 12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Back to Settings
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stages.map((stage) => {
              const isActive = stage.status === 'in_progress';
              const isDone = stage.status === 'complete';
              const isErr = stage.status === 'error';

              let statusColor = '#4b5563'; // gray
              let statusIcon = '○';
              if (isActive) {
                statusColor = '#f59e0b'; // amber
                statusIcon = '●';
              } else if (isDone) {
                statusColor = '#34d399'; // green
                statusIcon = '✓';
              } else if (isErr) {
                statusColor = '#ef4444'; // red
                statusIcon = '✗';
              }

              return (
                <div
                  key={stage.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid transparent',
                    opacity: stage.status === 'pending' ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: statusColor, width: '24px', textAlign: 'center' }}>
                    {statusIcon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: isActive ? '#fff' : '#d1d5db' }}>
                      {stage.label}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                      {stage.description}
                    </p>
                    {stage.detailText && (
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#38bdf8', fontWeight: '500' }}>
                        {stage.detailText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isGenerating && (
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#9ca3af' }}>
              Creating interactive components and animations... This may take up to a minute.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
