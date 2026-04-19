import { AlertCircle } from 'lucide-react';

interface Vital {
  type: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  loggedAt: string;
}

const VITAL_ICONS: Record<string, string> = {
  WEIGHT: '⚖️',
  BLOOD_PRESSURE_SYSTOLIC: '🩸',
  BLOOD_PRESSURE_DIASTOLIC: '🩸',
  HEART_RATE: '❤️',
  OXYGEN_SATURATION: '🫁',
  TEMPERATURE: '🌡️',
  BLOOD_GLUCOSE: '🩸',
};

const VITAL_LABELS: Record<string, string> = {
  WEIGHT: 'Weight',
  BLOOD_PRESSURE_SYSTOLIC: 'BP Systolic',
  BLOOD_PRESSURE_DIASTOLIC: 'BP Diastolic',
  HEART_RATE: 'Heart Rate',
  OXYGEN_SATURATION: 'O₂ Sat',
  TEMPERATURE: 'Temperature',
  BLOOD_GLUCOSE: 'Blood Glucose',
};

export function VitalSummary({ vitals }: { vitals: Vital[] }) {
  // Show most recent of each type
  const latest = vitals.reduce((acc: Record<string, Vital>, v) => {
    if (!acc[v.type] || new Date(v.loggedAt) > new Date(acc[v.type].loggedAt)) {
      acc[v.type] = v;
    }
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.values(latest).map((vital) => (
        <div key={vital.type} className={`card py-3 px-4 ${vital.isAbnormal ? 'border-red-200 bg-red-50' : ''}`}>
          <div className="flex items-start justify-between">
            <span className="text-xl">{VITAL_ICONS[vital.type] || '📊'}</span>
            {vital.isAbnormal && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
          <p className="font-bold text-slate-800 text-lg mt-1">
            {vital.value}
            <span className="text-xs font-normal text-slate-400 ml-1">{vital.unit}</span>
          </p>
          <p className="text-xs text-slate-400">{VITAL_LABELS[vital.type]}</p>
        </div>
      ))}
    </div>
  );
}
