'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { ThemeToggle } from '../theme/theme-toggle';

export function StaffHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.user.id)
          .single();
        setUser(profile);
      }
    };
    loadUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/iniciar-sesion');
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[color:var(--border)] bg-[color:var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--background)]/80">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Panel Operativo</h1>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            Staff
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[color:var(--muted)]/40"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {user?.full_name?.[0] || user?.email?.[0] || 'S'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl">
                <div className="border-b border-[color:var(--border)] p-4">
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {user?.full_name || 'Staff'}
                  </p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">{user?.email}</p>
                  <span className="mt-2 inline-block text-xs text-emerald-600 dark:text-emerald-400">
                    Rol: Operativo
                  </span>
                </div>
                <ul className="p-2">
                  <li>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[color:var(--muted)]/40"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span>👤</span>
                      <span>Mi cuenta</span>
                    </Link>
                  </li>
                </ul>
                <div className="border-t border-[color:var(--border)] p-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                  >
                    <span>🚪</span>
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
