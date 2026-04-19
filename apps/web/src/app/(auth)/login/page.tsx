'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Activity, Heart, Shield } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, enterDemo } = useAuthStore();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.data.accessToken, data.data.refreshToken, data.data.user);
      const role = data.data.user.role;
      router.push(role === 'PATIENT' ? '/dashboard' : '/care-team/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Brand panel ─────────────────────────────────────────────────────── */}
      <div className="relative md:w-2/5 bg-gradient-to-br from-cyan-700 via-cyan-600 to-teal-500 flex flex-col justify-between p-8 md:p-12 text-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SwellnessIQ</span>
        </div>

        {/* Tagline — hidden on mobile */}
        <div className="relative hidden md:block">
          <h1 className="text-3xl font-bold leading-snug mb-4">
            Your partner in a safer recovery
          </h1>
          <p className="text-cyan-100 text-base leading-relaxed mb-8">
            Personalized lessons, vitals monitoring, and 24/7 clinical support — designed to keep you home and healthy.
          </p>
          <div className="space-y-3">
            {[
              { icon: Activity, text: 'Track your vitals daily' },
              { icon: Shield, text: 'Clinically proven care protocols' },
              { icon: Heart,   text: 'Connected to your care team' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-cyan-100">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-cyan-200 text-xs hidden md:block">
          © 2025 SwellnessIQ. HIPAA compliant.
        </p>
      </div>

      {/* ── Login form ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 md:p-12">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">SwellnessIQ</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-7">Sign in to continue your recovery</p>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5" role="alert">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-0 min-w-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-slate-50 text-slate-400 text-xs">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { enterDemo(); router.push('/dashboard'); }}
            className="btn-secondary w-full"
          >
            Try Demo
          </button>
          <p className="text-center text-slate-400 text-xs mt-2">
            Explore with sample Heart Failure patient data — no account needed
          </p>

          <p className="text-center text-slate-500 text-sm mt-7">
            Need help?{' '}
            <Link href="/support" className="text-cyan-600 hover:underline font-medium">
              Contact your care team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
