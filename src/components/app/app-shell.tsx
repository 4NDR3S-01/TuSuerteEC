'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/use-auth';

type AppShellProps = {
  readonly children: ReactNode;
  readonly subtitle?: string;
};

export function AppShell({ children, subtitle }: AppShellProps) {
  const { user, loading, isProcessing, signOut, error } = useAuth({ required: true });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--muted-foreground)]">
        <span className="animate-pulse text-sm font-medium">Validando sesión…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--muted-foreground)]">
        <span className="animate-pulse text-sm font-medium">Redirigiendo al inicio de sesión…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              TuSuerte
            </Link>
            <span className="text-xs font-medium text-[color:var(--muted-foreground)]">
              {subtitle ?? 'Panel principal'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs font-medium text-[color:var(--muted-foreground)] sm:block">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{user.email}</p>
              <p>ID: {user.id.slice(0, 6)}…</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </header>
      {error ? (
        <div className="bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100">
          <div className="mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6 lg:px-8">
            {error}
          </div>
        </div>
      ) : null}
      <main className="flex-1">{children}</main>
    </div>
  );
}
