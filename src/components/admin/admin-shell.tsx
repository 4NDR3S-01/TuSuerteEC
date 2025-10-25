'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../../hooks/use-auth';

type NavigationItem = {
  label: string;
  href: string;
  icon?: ReactNode;
};

type AdminShellProps = {
  readonly children: ReactNode;
  readonly subtitle?: string;
  readonly navigation: ReadonlyArray<NavigationItem>;
};

export function AdminShell({ children, subtitle, navigation }: AdminShellProps) {
  const { user, loading, signOut } = useAuth({ required: true });
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const homeHref = navigation[0]?.href ?? '/administrador';

  const truncate = (value: string | null | undefined, maxLength: number) => {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };

  const renderNavigation = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-lg shadow-[rgba(249,115,22,0.28)]'
                : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/60 hover:text-[color:var(--foreground)]'
            }`}
          >
            {item.icon ? <span className="text-lg">{item.icon}</span> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  if (loading || !user) {
    return null;
  }

  const profileCard = (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/80 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent)]/15 text-sm font-semibold text-[color:var(--accent)]">
        {user.email?.[0]?.toUpperCase() ?? 'A'}
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-xs font-semibold text-[color:var(--foreground)]">
          {truncate(user.user_metadata?.full_name ?? 'Administrador', 32)}
        </span>
        <span className="text-[10px] font-medium text-[color:var(--muted-foreground)]">
          {truncate(user.email, 32)}
        </span>
      </div>
      <Link
        href="/administrador/configuracion"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] text-xs text-[color:var(--muted-foreground)] transition-transform hover:-translate-y-0.5 hover:text-[color:var(--foreground)]"
        aria-label="Configuración de la cuenta"
      >
        ⚙️
      </Link>
    </div>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={() => void signOut()}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] transition-transform hover:-translate-y-0.5"
    >
      <span aria-hidden>⎋</span>
      Cerrar sesión
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-72 lg:flex-col border-r border-[color:var(--border)] bg-[color:var(--muted)]/60 backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-[color:var(--border)] px-6 py-6">
          <div>
            <Link href={homeHref} className="text-lg font-semibold tracking-tight">
              TuSuerte
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              {subtitle ?? 'Panel administrador'}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">{renderNavigation()}</div>
        <div className="border-t border-[color:var(--border)] px-4 py-5">
          {profileCard}
          {logoutButton}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menú de navegación"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--muted)]/95 p-5 shadow-2xl lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
                Menú
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] text-base text-[color:var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            >
              ✕
            </button>
          </div>
            <div className="flex flex-col gap-6">
              {profileCard}
              {renderNavigation(() => setMobileNavOpen(false))}
              {logoutButton}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
