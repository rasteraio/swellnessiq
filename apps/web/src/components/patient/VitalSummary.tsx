import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Vital {
  type: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  loggedAt: string;
}

const VITAL_CONFIG: Record<string, { label: string; shortLabel: string; color: string; bgColor: string }> = {
  WEIGHT:                   { label: 'Weight',       shortLabel: 'Wt',    color: 'text-cyan-600',    bgColor: 'bg-cyan-50' },
  BLOOD_PRESSURE_SYSTOLIC:  { label: 'BP Systolic',  shortLabel: 'SBP',   color: 'text-rose-600',    bgColor: 'bg-rose-50' },
  BLOOD_PRESSURE_DIASTOLIC: { label: 'BP Diastolic', shortLabel: 'DBP',   color: 'text-orange-600',  bgColor: 'bg-orange-50' },
  HEART_RATE:               { label: 'Heart Rate',   shortLabel: 'HR',    color: 'text-pink-600',    bgColor: 'bg-pink-50' },
  OXYGEN_SATURATION:        { label: 'O₂ Sat',       shortLabel: 'SpO₂',  color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  TEMPERATURE:              { label: 'Temperature',  shortLabel: 'Temp',  color: 'text-amber-600',   bgColor: 'bg-amber-50' },
  BLOOD_GLUCOSE:            { label: 'Blood Glucose', shortLabel: 'BG',   color: 'text-violet-600',  bgColor: 'bg-violet-50' },
};

export function VitalSummary({ vitals }: { vitals: Vital[] }) {
  const latest = vitals.reduce((acc: Record<string, Vital>, v) => {
    if (!acc[v.type] || new Date(v.loggedAt) > new Date(acc[v.type].loggedAt)) {
      acc[v.type] = v;
    }
    return acc;
  }, {});

  const items = Object.values(latest);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((vital) => {
        const cfg = VITAL_CONFIG[vital.type] || { label: vital.type, shortLabel: vital.type, color: 'text-slate-600', bgColor: 'bg-slate-50' };
        return (
          <div
            key={vital.type}
            className={cn(
              'bg-white rounded-2xl border shadow-card p-3.5',
              vital.isAbnormal ? 'border-red-200 bg-red-50/50' : 'border-slate-100'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-md', cfg.bgColor, cfg.color)}>
                {cfg.shortLabel}
              </span>
              {vital.isAbnormal && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
            </div>
            <p className={cn('text-xl font-bold', vital.isAbnormal ? 'text-red-700' : cfg.color)}>
              {vital.value}
              <span className="text-xs font-normal text-slate-400 ml-1">{vital.unit}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{cfg.label}</p>
          </div>
        );
      })}
    </div>
  );
}
