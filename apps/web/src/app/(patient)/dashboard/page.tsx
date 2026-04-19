'use client';

import { useQuery } from '@tanstack/react-query';
import { Heart, BookOpen, TrendingUp, Bell, MessageCircle, Activity } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';
import { ModuleCard } from '../../../components/patient/ModuleCard';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import { AlertBanner } from '../../../components/patient/AlertBanner';
import { VitalSummary } from '../../../components/patient/VitalSummary';
import { EngagementBadge } from '../../../components/patient/EngagementBadge';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const patientId = user?.patient?.id;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['patient-dashboard', patientId],
    queryFn: () => api.get(`/patients/${patientId}/dashboard`).then(r => r.data.data),
    enabled: !!patientId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!dashboard) return null;

  const { patient, daysPostDischarge, progress, nextModule, alerts, recentVitals, upcomingModules } = dashboard;

  return (
    <div className="min-h-screen bg-slate-50">
      <PatientNav />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Hello, {user?.firstName}!
            </h1>
            <p className="text-slate-500 mt-1">
              Day {daysPostDischarge} of your recovery
            </p>
          </div>
          <EngagementBadge level={patient.engagementLevel} />
        </div>

        {/* Critical alerts */}
        {alerts?.length > 0 && (
          <AlertBanner alerts={alerts} />
        )}

        {/* Progress card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Your Progress
            </h2>
            <span className="text-sm text-slate-500">{progress.completed}/{progress.total} modules</span>
          </div>
          <div className="flex items-center gap-6">
            <ProgressRing
              percent={Math.round(progress.rate * 100)}
              size={80}
              strokeWidth={8}
              color="#2563EB"
            />
            <div className="flex-1">
              <p className="text-3xl font-bold text-blue-600">{Math.round(progress.rate * 100)}%</p>
              <p className="text-slate-500 text-sm">modules completed</p>
              {progress.rate >= 0.5 && (
                <p className="text-green-600 text-sm font-medium mt-1">Keep it up!</p>
              )}
            </div>
          </div>
        </div>

        {/* Next module */}
        {nextModule && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Up Next
            </h2>
            <ModuleCard module={nextModule.module} status={nextModule.status} isPrimary />
          </div>
        )}

        {/* Upcoming modules */}
        {upcomingModules?.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3">Coming Up</h2>
            <div className="space-y-3">
              {upcomingModules.map((sm: any) => (
                <ModuleCard key={sm.moduleId} module={sm.module} status={sm.status} />
              ))}
            </div>
          </div>
        )}

        {/* Recent vitals */}
        {recentVitals?.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Recent Vitals
            </h2>
            <VitalSummary vitals={recentVitals} />
          </div>
        )}

        {/* Risk indicator */}
        {patient.riskScore >= 60 && (
          <div className="card border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Stay on track</p>
                <p className="text-sm text-orange-700 mt-1">
                  Completing your modules helps reduce your chance of returning to the hospital.
                  Your care team is monitoring your progress.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-16 bg-white border-b border-slate-100" />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
