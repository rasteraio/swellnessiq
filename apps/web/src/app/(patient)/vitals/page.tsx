'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Plus, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';

const VITAL_CONFIG = [
  { type: 'WEIGHT', label: 'Weight', unit: 'lbs', color: '#2563EB', icon: '⚖️', min: null, max: null },
  { type: 'BLOOD_PRESSURE_SYSTOLIC', label: 'Blood Pressure (Systolic)', unit: 'mmHg', color: '#DC2626', icon: '🩸', min: 90, max: 130 },
  { type: 'BLOOD_PRESSURE_DIASTOLIC', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', color: '#D97706', icon: '🩸', min: 60, max: 80 },
  { type: 'HEART_RATE', label: 'Heart Rate', unit: 'bpm', color: '#DB2777', icon: '❤️', min: 60, max: 100 },
  { type: 'OXYGEN_SATURATION', label: 'Oxygen Saturation', unit: '%', color: '#059669', icon: '🫁', min: 95, max: 100 },
];

export default function VitalsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const patientId = user?.patient?.id;

  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('WEIGHT');
  const [value, setValue] = useState('');

  const { data: vitals } = useQuery({
    queryKey: ['vitals', patientId],
    queryFn: () => api.get(`/vitals/${patientId}?days=30`).then(r => r.data.data),
    enabled: !!patientId,
  });

  const logMutation = useMutation({
    mutationFn: () => {
      const config = VITAL_CONFIG.find(v => v.type === selectedType)!;
      return api.post('/vitals', {
        patientId,
        type: selectedType,
        value: parseFloat(value),
        unit: config.unit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals', patientId] });
      setValue('');
      setShowForm(false);
    },
  });

  const grouped = vitals?.grouped || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <PatientNav />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" />
            My Vitals
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary py-2 px-4 text-sm"
          >
            <Plus className="w-4 h-4" /> Log vital
          </button>
        </div>

        {/* Log form */}
        {showForm && (
          <div className="card border-blue-200 bg-blue-50/50">
            <h2 className="font-semibold text-slate-700 mb-4">Log a vital sign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Vital type</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none text-slate-800"
                >
                  {VITAL_CONFIG.map(v => (
                    <option key={v.type} value={v.type}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Value ({VITAL_CONFIG.find(v => v.type === selectedType)?.unit})
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="Enter value"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none text-slate-800 text-lg"
                />
              </div>
              <button
                onClick={() => logMutation.mutate()}
                disabled={!value || logMutation.isPending}
                className="btn-primary w-full"
              >
                {logMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Charts for each vital type */}
        {VITAL_CONFIG.map(config => {
          const data: any[] = grouped[config.type] || [];
          if (data.length === 0) return null;

          const latest = data[data.length - 1];
          const hasAbnormal = data.some((d: any) => d.isAbnormal);

          return (
            <div key={config.type} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    <span>{config.icon}</span>
                    {config.label}
                  </h2>
                  <p className="text-2xl font-bold mt-1" style={{ color: config.color }}>
                    {latest.value} <span className="text-sm font-normal text-slate-400">{config.unit}</span>
                  </p>
                </div>
                {hasAbnormal && (
                  <div className="badge badge-red gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Abnormal
                  </div>
                )}
              </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="loggedAt"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(v: any) => [`${v} ${config.unit}`, config.label]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={config.color}
                      strokeWidth={2}
                      dot={(props: any) => {
                        const item = data[props.index];
                        return item?.isAbnormal
                          ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#DC2626" />
                          : <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={config.color} />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {config.min !== null && (
                <p className="text-xs text-slate-400 mt-2">
                  Normal range: {config.min}–{config.max} {config.unit}
                </p>
              )}
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && !showForm && (
          <div className="card text-center py-12">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No vitals logged yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
              Log your first vital
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
