'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, BookOpen, FileText, Award, MessageSquare, LogOut, Menu, X, ExternalLink } from 'lucide-react';
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
    { label: 'Grammar', href: '/grammar', icon: FileText },
    { label: 'Exam Prep', href: '/goethe', icon: Award },
  ];

  if (pathname === '/login') {
    return (
      <header className="border-b-2 border-black dark:border-white bg-[var(--background)] sticky top-0 z-50">
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
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider bg-[#ffe600] text-black px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">ADMIN</span>
              <span className="font-black text-sm sm:text-base tracking-tight">Daily German Malayalam</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b-2 border-black dark:border-white bg-[var(--background)] sticky top-0 z-50 transition-colors">
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
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider bg-[#ffe600] text-black px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">ADMIN</span>
              <span className="font-black text-base sm:text-lg tracking-tight group-hover:underline decoration-2">Daily German CMS</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all border ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_#ffe600]'
                      : 'border-transparent hover:border-black dark:hover:border-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://dailygerman-nu.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
              title="View live learner site"
            >
              Learner Site <ExternalLink className="w-3 h-3" />
            </a>

            <ThemeToggle />

            {userEmail && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 border border-neutral-300 dark:border-neutral-700 hover:border-red-500 hover:text-red-500 transition-colors"
                title={`Signed in as ${userEmail}`}
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 border border-black dark:border-white"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-black dark:border-white bg-[var(--background)] px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-bold border ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <a
              href="https://dailygerman-nu.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold flex items-center gap-1"
            >
              Live Site <ExternalLink className="w-3 h-3" />
            </a>
            {userEmail && (
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-red-600 flex items-center gap-1"
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
