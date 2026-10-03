'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, BookOpen, FileText, Award, MessageSquare, LogOut, Menu, X, ExternalLink, Stethoscope, Lightbulb, Volume2, Zap, Headphones } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Overview', href: '/', icon: Shield },
    { label: 'Vocabulary', href: '/vocabulary', icon: BookOpen },
    { label: 'Verbs', href: '/verbs', icon: Zap },
    { label: 'Grammar', href: '/grammar', icon: FileText },
    { label: 'Speaking', href: '/speaking', icon: MessageSquare },
    { label: 'Reading', href: '/reading', icon: BookOpen },
    { label: 'Writing', href: '/writing', icon: FileText },
    { label: 'Listening', href: '/listening', icon: Headphones },
    { label: 'Medical', href: '/medical', icon: Stethoscope },
    { label: 'Exam Prep', href: '/goethe', icon: Award },
    { label: 'Suggestions', href: '/suggestions', icon: Lightbulb },
    { label: 'Audio AI', href: '/audio', icon: Volume2 },
  ];

  if (pathname === '/login') {
    return (
      <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Daily German Malayalam"
              width={48}
              height={38}
              className="h-9 w-auto object-contain shrink-0"
              priority
            />
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md shadow-xs">ADMIN</span>
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">Daily German Malayalam</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo.webp"
                alt="Daily German Malayalam"
                width={48}
                height={38}
                className="h-9 w-auto object-contain shrink-0 transition-transform group-hover:scale-105"
                priority
              />
              <span className="font-mono font-bold text-xs tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md shadow-xs">ADMIN</span>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">Daily German CMS</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden xl:flex items-center gap-3">
            <a
              href="https://dailygerman-nu.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="View live learner site"
            >
              Learner Site <ExternalLink className="w-3 h-3" />
            </a>

            <ThemeToggle />

            {userEmail && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-xs"
                title={`Signed in as ${userEmail}`}
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            )}
          </div>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex xl:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-1.5 shadow-lg rounded-b-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-1">
            <a
              href="https://dailygerman-nu.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
            >
              Live Site <ExternalLink className="w-3 h-3" />
            </a>
            {userEmail && (
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
