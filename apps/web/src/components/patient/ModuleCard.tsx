'use client';

import Link from 'next/link';
import { Clock, Lock, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const TYPE_CONFIG: Record<string, { label: string; accent: string; badge: string }> = {
  CORE_CONDITION:       { label: 'Core',        accent: 'border-cyan-400',    badge: 'badge-blue' },
  SELF_MONITORING:      { label: 'Monitoring',   accent: 'border-emerald-400', badge: 'badge-green' },
  BRANCHING:            { label: 'Deep Dive',    accent: 'border-violet-400',  badge: 'bg-violet-50 text-violet-700 border border-violet-200 badge' },
  POLYPHARMACY:         { label: 'Medications',  accent: 'border-amber-400',   badge: 'badge-yellow' },
  SOCIAL_DETERMINANTS:  { label: 'Support',      accent: 'border-slate-300',   badge: 'badge-gray' },
  REINFORCEMENT:        { label: 'Review',       accent: 'border-cyan-300',    badge: 'badge-blue' },
  PLATFORM_FUNDAMENTALS:{ label: 'Getting Started', accent: 'border-teal-400', badge: 'badge-green' },
};

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string;
    type: string;
    estimatedMinutes: number;
    isMandatory?: boolean;
  };
  status: string;
  isPrimary?: boolean;
}

export function ModuleCard({ module, status, isPrimary = false }: ModuleCardProps) {
  const isLocked    = status === 'LOCKED';
  const isCompleted = status === 'COMPLETED';
  const isActive    = status === 'AVAILABLE' || status === 'IN_PROGRESS';
  const typeConfig  = TYPE_CONFIG[module.type] || TYPE_CONFIG.CORE_CONDITION;

  if (isPrimary && isActive) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-card border border-cyan-100 bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">Up Next</span>
            {module.isMandatory && (
              <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Required</span>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug mb-1">{module.title}</h3>
          <p className="text-cyan-100 text-sm leading-relaxed line-clamp-2 mb-4">{module.description}</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-200 text-sm">
              <Clock className="w-3.5 h-3.5" />
              {module.estimatedMinutes} min
            </span>
            <Link
              href={`/modules/${module.id}`}
              className="flex items-center gap-2 bg-white text-cyan-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-cyan-50 transition-colors min-h-0"
            >
              Start <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden',
      'flex items-stretch transition-all duration-150',
      isLocked && 'opacity-55',
      isCompleted && 'bg-slate-50/80',
    )}>
      {/* Left accent bar */}
      <div className={cn('w-1 shrink-0', isCompleted ? 'bg-emerald-400' : isActive ? typeConfig.accent.replace('border-', 'bg-') : 'bg-slate-200')} />

      <div className="flex items-center gap-4 p-4 flex-1">
        {/* Status indicator */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isCompleted && 'bg-emerald-50',
          isActive    && 'bg-cyan-50',
          isLocked    && 'bg-slate-100',
        )}>
          {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-600" />}
          {isActive    && <Sparkles   className="w-5 h-5 text-cyan-600" />}
          {isLocked    && <Lock       className="w-4 h-4 text-slate-400" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', typeConfig.badge)}>
              {typeConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{module.title}</h3>
          <span className="flex items-center gap-1 text-slate-400 text-xs mt-1">
            <Clock className="w-3 h-3" />
            {module.estimatedMinutes} min
          </span>
        </div>

        {/* Arrow for active */}
        {isActive && (
          <Link
            href={`/modules/${module.id}`}
            className="shrink-0 w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center hover:bg-cyan-700 transition-colors min-h-0 min-w-0"
            aria-label={`Start ${module.title}`}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </Link>
        )}
      </div>
    </div>
  );
}
