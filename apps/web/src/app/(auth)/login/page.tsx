'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.data.accessToken, data.data.refreshToken, data.data.user);

      const role = data.data.user.role;
      if (role === 'PATIENT') router.push('/dashboard');
      else router.push('/care-team/dashboard');

    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Heart className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Rastera Health</h1>
          <p className="text-slate-500 mt-2">Your recovery companion</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5" role="alert">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 text-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
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
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 text-base"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-0 min-w-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full text-lg py-4"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Need help?{' '}
            <Link href="/support" className="text-blue-600 hover:underline font-medium">
              Contact your care team
            </Link>
          </p>
        </div>

        {/* Accessibility note */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Need accessibility accommodations?{' '}
          <Link href="/accessibility" className="text-blue-500 hover:underline">
            Adjust display settings
          </Link>
        </p>
      </div>
    </div>
  );
}
