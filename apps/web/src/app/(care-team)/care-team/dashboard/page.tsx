'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, AlertTriangle, TrendingUp, UserCheck } from 'lucide-react';
import { api } from '../../../../lib/api';
import { CareTeamNav } from '../../../../components/care-team/CareTeamNav';
import { PatientListItem } from '../../../../components/care-team/PatientListItem';

export default function CareTeamDashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['care-team-dashboard'],
    queryFn: () => api.get('/care-team/dashboard').then(r => r.data.data),
  });

  const { data: patients, isLoading } = useQuery({
    queryKey: ['my-patients'],
    queryFn: () => api.get('/care-team/my-patients').then(r => r.data.data),
  });

  const summaryCards = [
    { label: 'Total Patients', value: summary?.totalPatients ?? '—', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'High Risk', value: summary?.highRiskPatients ?? '—', icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Open Alerts', value: summary?.unresolvedAlerts ?? '—', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'At-Risk Engagement', value: summary?.atRiskEngagement ?? '—', icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <CareTeamNav />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Care Team Dashboard</h1>
          <p className="text-slate-500">Patient overview and engagement metrics</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-700">My Patients</h2>
            <a href="/care-team/patients" className="text-blue-600 text-sm font-medium hover:underline">
              View all
            </a>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card animate-pulse h-20" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {patients?.map((patient: any) => (
                <PatientListItem key={patient.id} patient={patient} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
