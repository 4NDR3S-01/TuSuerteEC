'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { ThemeToggle } from '../theme/theme-toggle';

type Notification = {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
  href?: string;
};

export function AdminHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Mock notifications (en producción, traer de la BD)
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Nuevos usuarios',
      description: '3 usuarios se registraron hoy',
      type: 'info',
      read: false,
      created_at: new Date().toISOString(),
      href: '/administrador/usuarios',
    },
    {
      id: '2',
      title: 'Sorteo próximo a cerrar',
      description: 'El sorteo "Premio Grande" cierra en 2 horas',
      type: 'warning',
      read: false,
      created_at: new Date().toISOString(),
      href: '/administrador/sorteos',
    },
    {
      id: '3',
      title: 'Ganador sin contactar',
      description: 'Juan Pérez no ha sido contactado',
      type: 'error',
      read: true,
      created_at: new Date().toISOString(),
      href: '/administrador/ganadores',
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  // Command palette (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/iniciar-sesion');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '🚨';
      default:
        return 'ℹ️';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-[color:var(--border)] bg-[color:var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--background)]/80">
        <div className="flex h-full items-center justify-between px-6">
          {/* Left: Search */}
          <div className="flex flex-1 items-center gap-4">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden rounded bg-[color:var(--muted)]/60 px-1.5 py-0.5 text-xs font-mono lg:inline">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
                aria-label="Notificaciones"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl">
                  <div className="border-b border-[color:var(--border)] p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[color:var(--foreground)]">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button className="text-xs font-semibold text-[color:var(--accent)]">
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">
                        No hay notificaciones
                      </div>
                    ) : (
                      <ul>
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={`border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--muted)]/20 ${
                              !notification.read ? 'bg-[color:var(--accent)]/5' : ''
                            }`}
                          >
                            <Link
                              href={notification.href || '#'}
                              className="block p-4"
                              onClick={() => setShowNotifications(false)}
                            >
                              <div className="flex gap-3">
                                <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-[color:var(--muted-foreground)]">
                                    {notification.description}
                                  </p>
                                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                    {new Date(notification.created_at).toLocaleString('es-EC', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-[color:var(--border)] p-3 text-center">
                    <Link
                      href="/administrador/notificaciones"
                      className="text-xs font-semibold text-[color:var(--accent)]"
                      onClick={() => setShowNotifications(false)}
                    >
                      Ver todas las notificaciones →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[color:var(--muted)]/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)]/20 text-sm font-bold text-[color:var(--accent)]">
                  {user?.full_name?.[0] || user?.email?.[0] || 'A'}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl">
                  <div className="border-b border-[color:var(--border)] p-4">
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      {user?.full_name || 'Administrador'}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">{user?.email}</p>
                  </div>
                  <ul className="p-2">
                    <li>
                      <Link
                        href="/administrador/configuracion"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[color:var(--muted)]/40"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span>⚙️</span>
                        <span>Configuración</span>
                      </Link>
                    </li>
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

      {/* Command Palette / Global Search */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[color:var(--border)] p-4">
              <input
                type="text"
                placeholder="Buscar usuarios, sorteos, ganadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-lg text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)]"
              />
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              <p className="px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
                Resultados próximamente...
              </p>
            </div>
            <div className="border-t border-[color:var(--border)] p-3">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
                <span>Escribe para buscar</span>
                <div className="flex items-center gap-2">
                  <kbd className="rounded bg-[color:var(--muted)]/60 px-2 py-1 font-mono">ESC</kbd>
                  <span>para cerrar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
