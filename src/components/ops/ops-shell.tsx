'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, KeyRound, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { Logo } from '../ui/logo';
import { ThemeToggle } from '../theme/theme-toggle';
import { useAuthContext } from '../auth/auth-provider';
import { getOpsAlerts, type OpsAlert } from '../../lib/actions/ops';
import { cn } from '../../lib/utils';

export type OpsNavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
export type OpsNavGroup = { title?: string; items: OpsNavItem[] };

type Props = {
  basePath: '/administrador' | '/staff' | '/app';
  title: string;
  nav: OpsNavGroup[];
  children: ReactNode;
  /** La cuenta usa una contraseña temporal asignada por un administrador */
  mustChangePassword?: boolean;
  /** Reemplaza la campana de tareas operativas (p. ej., notificaciones del participante) */
  headerActions?: ReactNode;
  /** Contenido extra al pie de la barra lateral */
  sidebarFooter?: ReactNode;
  /** Ruta de "Mi cuenta" para el aviso de contraseña temporal */
  accountHref?: string;
};

/** Estructura común de los paneles de operación (staff) y administración */
export function OpsShell({ basePath, title, nav, children, mustChangePassword = false, headerActions, sidebarFooter, accountHref }: Props) {
  const pathname = usePathname();
  const { user, signOut, isProcessing } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);

  useEffect(() => {
    setMenuOpen(false);
    setAlertsOpen(false);
  }, [pathname]);

  // Alertas reales; se refrescan al navegar y cada minuto
  useEffect(() => {
    if (basePath === '/app') return;
    const load = () => getOpsAlerts(basePath).then(setAlerts).catch(() => setAlerts([]));
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [basePath, pathname]);

  const isActive = (item: OpsNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));

  const sidebar = (
    <nav aria-label={title} className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center justify-between px-2">
        <Logo href={basePath} size="sm" />
        <button type="button" className="rounded-lg p-1.5 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <p className="px-3 text-xs font-bold uppercase tracking-widest text-[color:var(--accent)]">{title}</p>
      <div className="flex-1 space-y-5 overflow-y-auto">
        {nav.map((group, index) => (
          <div key={group.title ?? index} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{group.title}</p>
            )}
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item)
                    ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                    : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]',
                )}
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-[color:var(--border)] pt-4">
        {sidebarFooter}
        {user && (
          <div className="px-3">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-[color:var(--muted-foreground)]">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={isProcessing}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
        >
          <LogOut className="size-4" aria-hidden /> Cerrar sesión
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[color:var(--border)] bg-[color:var(--card)] lg:block">{sidebar}</aside>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-[color:var(--border)] bg-[color:var(--card)]">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--background)]/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" className="rounded-xl border border-[color:var(--border)] p-2" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
              <Menu className="size-5" aria-hidden />
            </button>
            <Logo href={basePath} size="sm" showText={false} />
          </div>
          <p className="hidden text-sm text-[color:var(--muted-foreground)] lg:block">{title}</p>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] sm:block">
              Ver sitio público
            </Link>
            <ThemeToggle />
            {headerActions ?? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAlertsOpen((value) => !value)}
                aria-expanded={alertsOpen}
                aria-label={`Tareas pendientes: ${alerts.length}`}
                className="relative flex size-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]"
              >
                <Bell className="size-5" aria-hidden />
                {alerts.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[color:var(--danger)] text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-[var(--shadow-raised)]">
                  {alerts.length === 0 ? (
                    <p className="p-4 text-sm text-[color:var(--muted-foreground)]">No hay tareas pendientes.</p>
                  ) : (
                    alerts.map((alert) => (
                      <Link key={alert.id} href={alert.href} className="block rounded-xl p-3 hover:bg-[color:var(--muted)]">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{alert.description}</p>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </header>
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {mustChangePassword && pathname !== (accountHref ?? `${basePath}/cuenta`).split('?')[0] && (
            <div role="alert" className="mx-auto mb-6 flex max-w-7xl flex-col gap-3 rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)] p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-medium">
                <KeyRound className="size-5 shrink-0 text-[color:var(--warning)]" aria-hidden />
                Estás usando una contraseña temporal. Cámbiala ahora para proteger tu cuenta.
              </span>
              <Link href={accountHref ?? `${basePath}/cuenta`} className="shrink-0 rounded-xl bg-[color:var(--accent)] px-4 py-2 text-center font-semibold text-[color:var(--accent-foreground)]">
                Cambiar contraseña
              </Link>
            </div>
          )}
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
