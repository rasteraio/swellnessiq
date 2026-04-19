'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';
import { ModuleCard } from '../../../components/patient/ModuleCard';

const STATUS_ORDER = { IN_PROGRESS: 0, AVAILABLE: 1, COMPLETED: 2, LOCKED: 3, SKIPPED: 4 };

export default function ModulesPage() {
  const { user } = useAuthStore();
  const patientId = user?.patient?.id;

  const { data: plan, isLoading } = useQuery({
    queryKey: ['learning-plan', patientId],
    queryFn: () => api.get(`/learning-plans/${patientId}`).then(r => r.data.data),
    enabled: !!patientId,
  });

  const scheduled = plan?.scheduledModules || [];
  const sorted = [...scheduled].sort((a: any, b: any) =>
    (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 5) -
    (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 5)
  );

  const available = sorted.filter((m: any) => m.status === 'AVAILABLE' || m.status === 'IN_PROGRESS');
  const completed = sorted.filter((m: any) => m.status === 'COMPLETED');
  const locked = sorted.filter((m: any) => m.status === 'LOCKED');

  return (
    <div className="min-h-screen bg-slate-50">
      <PatientNav />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-500" />
          Your Lessons
        </h1>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card h-24 animate-pulse" />
            ))}
          </div>
        )}

        {available.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Ready Now ({available.length})
            </h2>
            <div className="space-y-3">
              {available.map((sm: any) => (
                <ModuleCard key={sm.moduleId} module={sm.module} status={sm.status} />
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Completed ({completed.length})
            </h2>
            <div className="space-y-3">
              {completed.map((sm: any) => (
                <ModuleCard key={sm.moduleId} module={sm.module} status={sm.status} />
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Coming Up ({locked.length})
            </h2>
            <div className="space-y-3">
              {locked.slice(0, 5).map((sm: any) => (
                <ModuleCard key={sm.moduleId} module={sm.module} status={sm.status} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && scheduled.length === 0 && (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Your learning plan is being prepared.</p>
            <p className="text-slate-400 text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </main>
    </div>
  );
}
