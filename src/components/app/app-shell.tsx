'use client';

import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Logo } from '../ui/logo';

type AppShellProps = {
  readonly children: ReactNode;
  readonly subtitle?: string;
  readonly subscription?: {
    planName: string;
    renewalDate: string;
  } | null;
};

export function AppShell({ children, subtitle, subscription }: AppShellProps) {
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
      <header className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Logo href="/app" size="sm" />
            <div className="hidden sm:block h-8 w-px bg-[color:var(--border)]" />
            <div className="flex flex-col gap-0.5">
              {subscription ? (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[color:var(--foreground)]">{subscription.planName}</span>
                  </span>
                  <span className="text-[10px] text-[color:var(--muted-foreground)] ml-5">
                    Renueva: {subscription.renewalDate}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--muted-foreground)]">
                    {/* svg de corazon */}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{subtitle ?? 'Te deseo lo mejor'}</span>
                  </span>
                  <span className="text-[10px] text-[color:var(--accent)] font-medium ml-5">
                    Sin suscripción activa
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex flex-col items-end text-xs">
              <p className="font-semibold text-[color:var(--foreground)] truncate max-w-[200px]">
                {user.email}
              </p>
              <p className="text-[10px] text-[color:var(--muted-foreground)] font-mono">
                ID: {user.id.slice(0, 8)}
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isProcessing}
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--background)] border-2 border-[color:var(--border)] px-3 sm:px-4 py-2 text-xs font-bold text-[color:var(--foreground)] hover:border-red-500 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">{isProcessing ? 'Cerrando…' : 'Cerrar sesión'}</span>
              <span className="sm:hidden text-lg">🚪</span>
              {!isProcessing && (
                <svg 
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      {error ? (
        <div className="bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100 border-b border-red-200 dark:border-red-900">
          <div className="mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6 lg:px-8 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      ) : null}
      <main className="flex-1">{children}</main>
    </div>
  );
}
