'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, MessageCircle, Activity, User } from 'lucide-react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/modules',   icon: BookOpen,         label: 'Lessons' },
  { href: '/vitals',    icon: Activity,          label: 'Vitals' },
  { href: '/chat',      icon: MessageCircle,     label: 'Ask' },
  { href: '/profile',   icon: User,              label: 'Profile' },
];

export function PatientNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header */}
      <header className="bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">SwellnessIQ</span>
        </div>

        <Link
          href="/notifications"
          className="relative p-2 min-h-0 min-w-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 text-slate-500">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>
      </header>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch max-w-lg mx-auto h-16">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-6 rounded-lg transition-all',
                  isActive ? 'bg-cyan-50' : ''
                )}>
                  <Icon className={cn(
                    'w-[18px] h-[18px] transition-colors',
                    isActive ? 'text-cyan-600' : 'text-slate-400'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold transition-colors',
                  isActive ? 'text-cyan-600' : 'text-slate-400'
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
