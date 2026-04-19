'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, MessageCircle, Activity, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/modules', icon: BookOpen, label: 'Lessons' },
  { href: '/vitals', icon: Activity, label: 'Vitals' },
  { href: '/chat', icon: MessageCircle, label: 'Ask' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function PatientNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header (minimal) */}
      <header className="bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="font-semibold text-slate-700">Rastera</span>
        </div>
        <Link href="/notifications" className="relative p-2 min-h-0 min-w-0 w-9 h-9 flex items-center justify-center">
          <div className="w-5 h-5 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </Link>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-10 safe-area-pb" aria-label="Main navigation">
        <div className="flex items-stretch max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors gap-0.5',
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
