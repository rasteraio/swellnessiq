import Link from 'next/link';
import { AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

const ENGAGEMENT_STYLES: Record<string, string> = {
  HIGH: 'badge-green',
  MEDIUM: 'badge-blue',
  LOW: 'badge-yellow',
  AT_RISK: 'badge-red',
};

export function PatientListItem({ patient }: { patient: any }) {
  const criticalAlerts = patient.alerts?.filter((a: any) =>
    a.severity === 'CRITICAL' || a.severity === 'HIGH'
  ).length;

  return (
    <Link href={`/care-team/patients/${patient.id}`} className="card hover:border-blue-200 transition-all flex items-center gap-4 no-underline">
      {/* Avatar */}
      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-600 font-semibold">
        {patient.user.firstName[0]}{patient.user.lastName[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800">
            {patient.user.firstName} {patient.user.lastName}
          </p>
          {criticalAlerts > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalAlerts} alert{criticalAlerts > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">
            {patient.primaryCondition.replace('_', ' ')}
          </span>
          <span className={cn(ENGAGEMENT_STYLES[patient.engagementLevel] || 'badge-gray', 'text-xs')}>
            {patient.engagementLevel}
          </span>
          {patient.riskScore >= 70 && (
            <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
              <TrendingUp className="w-3 h-3" />
              High risk
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300" />
    </Link>
  );
}
