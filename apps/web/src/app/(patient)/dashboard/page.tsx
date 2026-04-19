'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, TrendingUp, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';
import { ModuleCard } from '../../../components/patient/ModuleCard';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import { AlertBanner } from '../../../components/patient/AlertBanner';
import { VitalSummary } from '../../../components/patient/VitalSummary';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const patientId = user?.patient?.id;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['patient-dashboard', patientId],
    queryFn: () => api.get(`/patients/${patientId}/dashboard`).then(r => r.data.data),
    enabled: !!patientId,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!dashboard) return null;

  const { patient, daysPostDischarge, progress, nextModule, alerts, recentVitals, upcomingModules } = dashboard;
  const percent = Math.round(progress.rate * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <PatientNav />

      <main className="max-w-lg mx-auto px-4 py-5 pb-24 space-y-4 animate-fade-in">

        {/* Greeting + Day counter */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-2xl p-5 text-white shadow-card-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-cyan-200 text-sm font-medium">Good morning,</p>
              <h1 className="text-2xl font-bold mt-0.5">{user?.firstName} {user?.lastName}</h1>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold leading-none">{daysPostDischarge}</p>
              <p className="text-cyan-200 text-xs mt-0.5">days since<br/>discharge</p>
            </div>
          </div>
          {patient.riskScore >= 60 && (
            <div className="mt-4 bg-white/15 rounded-xl p-3 text-sm text-cyan-50">
              Your care team is monitoring your progress. Keep completing your lessons to reduce your readmission risk.
            </div>
          )}
        </div>

        {/* Alerts */}
        {alerts?.length > 0 && <AlertBanner alerts={alerts} />}

        {/* Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              Recovery Progress
            </h2>
            <Link href="/modules" className="text-xs text-cyan-600 font-semibold flex items-center gap-0.5 hover:underline min-h-0">
              All lessons <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing percent={percent} size={72} strokeWidth={7} color="#0891B2" trackColor="#E0F2FE" />
            <div>
              <p className="text-3xl font-bold text-cyan-600">{percent}<span className="text-lg">%</span></p>
              <p className="text-slate-500 text-sm">{progress.completed} of {progress.total} lessons done</p>
              {percent >= 50 && (
                <p className="text-emerald-600 text-xs font-semibold mt-1">Great momentum!</p>
              )}
            </div>
          </div>
        </div>

        {/* Next module */}
        {nextModule && (
          <div>
            <p className="section-label mb-2">Up Next</p>
            <ModuleCard module={nextModule.module} status={nextModule.status} isPrimary />
          </div>
        )}

        {/* Upcoming modules */}
        {upcomingModules?.length > 0 && (
          <div>
            <p className="section-label mb-2">Coming Up</p>
            <div className="space-y-2.5">
              {upcomingModules.map((sm: any) => (
                <ModuleCard key={sm.moduleId} module={sm.module} status={sm.status} />
              ))}
            </div>
          </div>
        )}

        {/* Recent vitals */}
        {recentVitals?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Recent Vitals
              </p>
              <Link href="/vitals" className="text-xs text-cyan-600 font-semibold flex items-center gap-0.5 hover:underline min-h-0">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <VitalSummary vitals={recentVitals} />
          </div>
        )}

      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-14 bg-white border-b border-slate-100 shadow-sm" />
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="h-28 bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 rounded-2xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl shadow-card border border-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
