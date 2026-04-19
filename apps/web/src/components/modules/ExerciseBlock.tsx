'use client';

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle, Circle } from 'lucide-react';

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
}

interface Exercise {
  id: string;
  type: string;
  prompt: string;
  options?: Option[];
}

interface ExerciseBlockProps {
  exercise: Exercise;
  onResponse: (response: { selectedOptionId?: string; freeTextResponse?: string; numericValue?: number }) => void;
}

export function ExerciseBlock({ exercise, onResponse }: ExerciseBlockProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  function handleOptionSelect(optionId: string) {
    if (showFeedback) return; // No re-selecting after feedback
    setSelected(optionId);
    setShowFeedback(true);
    onResponse({ selectedOptionId: optionId });
  }

  if (exercise.type === 'QUIZ' && exercise.options) {
    return (
      <div>
        <p className="font-medium text-slate-800 text-lg mb-4">{exercise.prompt}</p>
        <div className="space-y-3">
          {exercise.options.map((option) => {
            const isSelected = selected === option.id;
            const isCorrect = option.isCorrect;
            const showResult = showFeedback && isSelected;

            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                disabled={showFeedback && !isSelected}
                className={cn(
                  'w-full text-left p-4 rounded-xl border-2 transition-all duration-150',
                  !showFeedback && 'border-slate-200 hover:border-blue-300 hover:bg-blue-50',
                  isSelected && !showFeedback && 'border-blue-500 bg-blue-50',
                  showResult && isCorrect && 'border-green-500 bg-green-50',
                  showResult && !isCorrect && 'border-red-400 bg-red-50',
                  showFeedback && !isSelected && 'border-slate-100 opacity-50',
                )}
              >
                <div className="flex items-start gap-3">
                  {showResult ? (
                    isCorrect
                      ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      : <Circle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 mt-0.5 shrink-0',
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    )} />
                  )}
                  <span className={cn(
                    'text-sm',
                    showResult && isCorrect && 'text-green-800 font-medium',
                    showResult && !isCorrect && 'text-red-700',
                    !showResult && 'text-slate-700'
                  )}>
                    {option.text}
                  </span>
                </div>
                {showResult && option.feedback && (
                  <p className={cn(
                    'text-xs mt-2 ml-8',
                    isCorrect ? 'text-green-700' : 'text-red-600'
                  )}>
                    {option.feedback}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (exercise.type === 'CHECKIN' || exercise.type === 'REFLECTION') {
    return (
      <div>
        <p className="font-medium text-slate-800 text-lg mb-3">{exercise.prompt}</p>
        <textarea
          value={freeText}
          onChange={(e) => {
            setFreeText(e.target.value);
            onResponse({ freeTextResponse: e.target.value });
          }}
          placeholder="Type your response here..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-slate-800"
        />
      </div>
    );
  }

  if (exercise.type === 'VITAL_LOG' || exercise.type === 'SYMPTOM_LOG') {
    return (
      <div>
        <p className="font-medium text-slate-800 text-lg mb-3">{exercise.prompt}</p>
        <input
          type="number"
          value={numericValue}
          onChange={(e) => {
            setNumericValue(e.target.value);
            onResponse({ numericValue: parseFloat(e.target.value) });
          }}
          placeholder="Enter a number"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-lg"
        />
      </div>
    );
  }

  return null;
}
