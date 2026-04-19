'use client';

import { AlertTriangle, X, Phone } from 'lucide-react';
import { useState } from 'react';

interface Alert {
  id: string;
  severity: string;
  type: string;
  message: string;
}

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const critical = visible.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
  const others = visible.filter(a => a.severity === 'MEDIUM' || a.severity === 'LOW');

  return (
    <div className="space-y-2">
      {critical.map(alert => (
        <div key={alert.id} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">Action required</p>
            <p className="text-red-600 text-sm mt-0.5">{alert.message}</p>
            <a href="tel:911" className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-red-700 hover:underline">
              <Phone className="w-3.5 h-3.5" />
              Call 911 for emergencies
            </a>
          </div>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            className="text-red-400 hover:text-red-600 min-h-0 min-w-0 w-6 h-6 flex items-center justify-center"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {others.slice(0, 2).map(alert => (
        <div key={alert.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-700 text-sm flex-1">{alert.message}</p>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            className="text-amber-400 min-h-0 min-w-0 w-5 h-5 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
