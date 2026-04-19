'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../stores/authStore';
import { VideoPlayer } from '../../../../components/modules/VideoPlayer';
import { TextBlock } from '../../../../components/modules/TextBlock';
import { ExerciseBlock } from '../../../../components/modules/ExerciseBlock';

type Phase = 'content' | 'exercise' | 'complete';

export default function ModulePage() {
  const { id: moduleId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const patientId = user?.patient?.id;

  const [phase, setPhase] = useState<Phase>('content');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [startTime] = useState(Date.now());

  const { data: module, isLoading } = useQuery({
    queryKey: ['module', moduleId, patientId],
    queryFn: () => api.get(`/modules/${moduleId}?patientId=${patientId}`).then(r => r.data.data),
    enabled: !!moduleId,
  });

  // Start module on load
  useQuery({
    queryKey: ['start-module', moduleId],
    queryFn: () => api.post(`/progress/${moduleId}/start`, { patientId }),
    enabled: !!moduleId && !!patientId,
    staleTime: Infinity,
  });

  const completeMutation = useMutation({
    mutationFn: (data: any) => api.post(`/progress/${moduleId}/complete`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patient-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['learning-plan'] });
      setPhase('complete');
    },
  });

  function handleExerciseResponse(exerciseId: string, response: any) {
    setResponses(prev => {
      const filtered = prev.filter(r => r.exerciseId !== exerciseId);
      return [...filtered, { exerciseId, ...response }];
    });
  }

  function handleComplete() {
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
    completeMutation.mutate({
      patientId,
      timeSpentSeconds,
      responses,
    });
  }

  if (isLoading) return <ModuleLoadingSkeleton />;
  if (!module) return null;

  const contentBlocks = module.contentBlocks || [];
  const exercises = module.exercises || [];
  const currentBlock = contentBlocks[currentBlockIndex];
  const isLastBlock = currentBlockIndex === contentBlocks.length - 1;

  if (phase === 'complete') {
    const result = completeMutation.data?.data?.data;
    return <CompletionScreen module={module} result={result} onContinue={() => router.push('/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 min-w-0 min-h-0"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{module.type.replace('_', ' ')}</p>
          <h1 className="font-semibold text-slate-800 leading-snug">{module.title}</h1>
        </div>
        <span className="text-sm text-slate-400">
          {phase === 'content'
            ? `${currentBlockIndex + 1}/${contentBlocks.length}`
            : `Quiz`}
        </span>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{
            width: phase === 'content'
              ? `${((currentBlockIndex + 1) / contentBlocks.length) * (exercises.length ? 80 : 100)}%`
              : phase === 'exercise' ? '90%' : '100%'
          }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {phase === 'content' && currentBlock && (
          <div className="max-w-lg mx-auto">
            {currentBlock.type === 'VIDEO' && (
              <VideoPlayer
                src={currentBlock.content}
                title={currentBlock.title}
                transcript={currentBlock.transcript}
              />
            )}
            {currentBlock.type === 'TEXT' && (
              <div className="p-5">
                <h2 className="text-xl font-bold text-slate-800 mb-4">{currentBlock.title}</h2>
                <TextBlock content={currentBlock.content} />
              </div>
            )}
          </div>
        )}

        {phase === 'exercise' && exercises.length > 0 && (
          <div className="max-w-lg mx-auto p-5">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Quick Check</h2>
            <p className="text-slate-500 mb-6">Let's make sure the key points landed.</p>
            <div className="space-y-6">
              {exercises.map((exercise: any) => (
                <ExerciseBlock
                  key={exercise.id}
                  exercise={exercise}
                  onResponse={(response) => handleExerciseResponse(exercise.id, response)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer navigation */}
      <footer className="p-4 border-t border-slate-100 bg-white">
        <div className="max-w-lg mx-auto">
          {phase === 'content' && !isLastBlock && (
            <button
              onClick={() => setCurrentBlockIndex(i => i + 1)}
              className="btn-primary w-full"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {phase === 'content' && isLastBlock && (
            <button
              onClick={() => exercises.length > 0 ? setPhase('exercise') : handleComplete()}
              className="btn-primary w-full"
            >
              {exercises.length > 0 ? 'Take the quiz' : 'Complete lesson'}
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {phase === 'exercise' && (
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending || responses.length < exercises.length}
              className="btn-primary w-full"
            >
              {completeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : 'Submit answers'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function CompletionScreen({ module, result, onContinue }: any) {
  const passed = result?.passed ?? true;
  const score = result?.score;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${passed ? 'bg-green-100' : 'bg-amber-100'}`}>
        <CheckCircle className={`w-14 h-14 ${passed ? 'text-green-600' : 'text-amber-600'}`} />
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        {passed ? 'Lesson Complete!' : 'Good effort!'}
      </h1>

      <p className="text-slate-500 mb-4 max-w-xs">
        {result?.feedback || 'You completed this lesson. Great work on your recovery journey!'}
      </p>

      {score !== null && score !== undefined && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 w-full max-w-xs">
          <p className="text-4xl font-bold text-blue-600">{Math.round(score)}%</p>
          <p className="text-slate-500 text-sm">Quiz score</p>
        </div>
      )}

      <button onClick={onContinue} className="btn-primary w-full max-w-xs">
        Back to Dashboard
      </button>
    </div>
  );
}

function ModuleLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-16 bg-white border-b border-slate-100 animate-pulse" />
      <div className="aspect-video bg-slate-200 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-6 bg-slate-200 rounded w-2/3 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-4/5 animate-pulse" />
      </div>
    </div>
  );
}
