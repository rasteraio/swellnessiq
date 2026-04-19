'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, AlertTriangle, BarChart3, Heart, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';

const NAV_ITEMS = [
  { href: '/care-team/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/care-team/patients', icon: Users, label: 'Patients' },
  { href: '/care-team/alerts', icon: AlertTriangle, label: 'Alerts' },
  { href: '/care-team/analytics', icon: BarChart3, label: 'Analytics' },
];

export function CareTeamNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    logout();
  }

  return (
    <nav className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-6 sticky top-0 z-10">
      <Link href="/care-team/dashboard" className="flex items-center gap-2 font-bold text-slate-800">
        <Heart className="w-5 h-5 text-blue-600" />
        Rastera Care
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-0',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-sm text-slate-500">{user?.firstName} {user?.lastName}</span>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors min-h-0 min-w-0 w-8 h-8 flex items-center justify-center">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
