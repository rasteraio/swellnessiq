'use client';

import Link from 'next/link';
import { Clock, Lock, CheckCircle, PlayCircle, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const MODULE_TYPE_COLORS: Record<string, string> = {
  CORE_CONDITION: 'badge-blue',
  SELF_MONITORING: 'badge-green',
  COMORBIDITY: 'badge-yellow',
  POLYPHARMACY: 'badge-red',
  SOCIAL_DETERMINANTS: 'badge-gray',
  REINFORCEMENT: 'badge-blue',
};

const MODULE_TYPE_LABELS: Record<string, string> = {
  CORE_CONDITION: 'Core',
  SELF_MONITORING: 'Monitoring',
  COMORBIDITY: 'Comorbidity',
  POLYPHARMACY: 'Medications',
  SOCIAL_DETERMINANTS: 'Support',
  REINFORCEMENT: 'Review',
};

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string;
    type: string;
    estimatedMinutes: number;
    thumbnailUrl?: string;
    difficulty?: number;
  };
  status: string;
  isPrimary?: boolean;
}

export function ModuleCard({ module, status, isPrimary = false }: ModuleCardProps) {
  const isLocked = status === 'LOCKED';
  const isCompleted = status === 'COMPLETED';
  const isAvailable = status === 'AVAILABLE' || status === 'IN_PROGRESS';

  return (
    <div className={cn(
      'card transition-all duration-200',
      isPrimary && 'border-blue-200 bg-blue-50/50',
      isLocked && 'opacity-60',
      isAvailable && !isPrimary && 'hover:border-blue-200',
      isCompleted && 'border-green-200 bg-green-50/30'
    )}>
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          isCompleted && 'bg-green-100',
          isAvailable && 'bg-blue-100',
          isLocked && 'bg-slate-100'
        )}>
          {isCompleted && <CheckCircle className="w-7 h-7 text-green-600" />}
          {isAvailable && <PlayCircle className="w-7 h-7 text-blue-600" />}
          {isLocked && <Lock className="w-6 h-6 text-slate-400" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={MODULE_TYPE_COLORS[module.type]}>
              {MODULE_TYPE_LABELS[module.type]}
            </span>
            {isPrimary && isAvailable && (
              <span className="badge bg-blue-600 text-white">Ready now</span>
            )}
          </div>

          <h3 className={cn(
            'font-semibold text-slate-800 leading-snug',
            isPrimary ? 'text-lg' : 'text-base'
          )}>
            {module.title}
          </h3>

          {isPrimary && (
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{module.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-slate-400 text-sm">
              <Clock className="w-3.5 h-3.5" />
              {module.estimatedMinutes} min
            </span>
            {module.difficulty && (
              <span className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      i < (module.difficulty || 1) ? 'bg-blue-400' : 'bg-slate-200'
                    )}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        {/* CTA arrow */}
        {isAvailable && (
          <Link
            href={`/modules/${module.id}`}
            className="shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors min-h-0 min-w-0"
            aria-label={`Start ${module.title}`}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </Link>
        )}
      </div>

      {/* Start button for primary module */}
      {isPrimary && isAvailable && (
        <Link
          href={`/modules/${module.id}`}
          className="btn-primary w-full mt-4"
        >
          Start Lesson
        </Link>
      )}
    </div>
  );
}
