'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User, Heart, Calendar, Phone, LogOut, ChevronRight, Shield, Bell } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';

const CONDITION_LABELS: Record<string, string> = {
  HEART_FAILURE: 'Heart Failure',
  COPD: 'COPD',
  PNEUMONIA: 'Pneumonia',
  TOTAL_HIP_REPLACEMENT: 'Hip Replacement',
  TOTAL_KNEE_REPLACEMENT: 'Knee Replacement',
  CABG: 'Coronary Artery Bypass',
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: () => api.get('/patients/me').then(r => r.data.data),
    enabled: !!user,
  });

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/login');
  }

  const dischargeDate = profile?.dischargeDate
    ? new Date(profile.dischargeDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const daysPostDischarge = profile?.dischargeDate
    ? Math.floor((Date.now() - new Date(profile.dischargeDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <PatientNav />

      <main className="max-w-lg mx-auto px-4 py-5 pb-24 space-y-4">

        {/* Avatar + name */}
        <div className="card flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h1>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            {user?.phone && <p className="text-slate-400 text-xs mt-0.5">{user.phone}</p>}
          </div>
        </div>

        {/* Recovery info */}
        {profile && (
          <div className="card space-y-3">
            <p className="section-label">Recovery</p>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Primary condition</p>
                <p className="font-semibold text-slate-700">{CONDITION_LABELS[profile.primaryCondition] || profile.primaryCondition}</p>
              </div>
            </div>

            {dischargeDate && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-cyan-50 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Discharge date</p>
                  <p className="font-semibold text-slate-700">{dischargeDate}</p>
                  {daysPostDischarge !== null && (
                    <p className="text-xs text-slate-400">{daysPostDischarge} day{daysPostDischarge !== 1 ? 's' : ''} into recovery</p>
                  )}
                </div>
              </div>
            )}

            {profile.careTeam && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Care team</p>
                  <p className="font-semibold text-slate-700">{profile.careTeam.name || 'SwellnessIQ Care'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings links */}
        <div className="card-flat divide-y divide-slate-100">
          <p className="section-label pb-3">Settings</p>

          <button
            className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-slate-50 -mx-5 px-5 transition-colors"
            onClick={() => {/* future: notifications settings */}}
          >
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-700">Notifications</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-slate-50 -mx-5 px-5 transition-colors"
            onClick={() => {/* future: privacy settings */}}
          >
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-700">Privacy &amp; Security</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* App info */}
        <div className="text-center text-xs text-slate-400 space-y-1 pt-2">
          <p>SwellnessIQ · Version 1.0</p>
          <p>HIPAA compliant · Data encrypted in transit and at rest</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

      </main>
    </div>
  );
}
