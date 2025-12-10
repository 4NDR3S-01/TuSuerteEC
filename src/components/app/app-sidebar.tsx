'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Logo } from '../ui/logo';
import { useSidebar } from '../../hooks/use-sidebar';
import { useTheme } from '../theme/theme-provider';
import { NotificationsPanel } from '../notifications/notifications-panel';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { 
  Home, 
  Ticket, 
  Gift, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

type User = {
  id: string;
  email?: string;
  fullName?: string;
};

type Subscription = {
  planName: string;
  renewalDate: string;
} | null;

type AppSidebarProps = {
  user: User;
  subscription: Subscription;
  onSignOut: () => void;
  isProcessing: boolean;
};

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: Home },
  { href: '/app/sorteos', label: 'Sorteos', icon: Gift },
  { href: '/app/boletos', label: 'Mis Boletos', icon: Ticket },
  { href: '/app/planes', label: 'Planes', icon: CreditCard },
  { href: '/app/settings', label: 'Configuración', icon: Settings },
];

export function AppSidebar({ user, subscription, onSignOut, isProcessing }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { mode, setMode } = useTheme();

  // Obtener full_name desde user_metadata de Supabase
  const fullName = (user as any)?.user_metadata?.full_name || user.fullName;
  const userEmail = user.email;

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (fullName) {
      const names = fullName.split(' ').filter(Boolean);
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0].slice(0, 2).toUpperCase();
    }
    if (userEmail) {
      return userEmail.slice(0, 2).toUpperCase();
    }
    return 'US';
  };

  // Cargar notificaciones no leídas desde Supabase
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Intentar cargar desde la tabla notifications
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        
        if (!error && count !== null) {
          setNotificationsCount(count);
        } else {
          // Si la tabla no existe aún, usar valor de ejemplo
          setNotificationsCount(0);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotificationsCount(0);
      }
    };

    void loadNotifications();

    // Suscribirse a cambios en tiempo real
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user?.id]);

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const getThemeIcon = () => {
    return mode === 'light' ? Sun : Moon;
  };

  const isActive = (href: string) => {
    if (href === '/app') {
      return pathname === '/app';
    }
    return pathname.startsWith(href);
  };

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Toggle Button - Fixed en la esquina superior derecha */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-30 p-3 rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-orange-500 text-white shadow-lg hover:shadow-2xl transition-all duration-200 active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-20"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Desktop Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:block fixed top-4 z-50 p-2 rounded-r-xl bg-[color:var(--card)] border border-l-0 border-[color:var(--border)] shadow-lg hover:shadow-xl transition-all duration-300"
        style={{ left: isCollapsed ? '96px' : '288px' }}
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-[color:var(--card)] border-r border-[color:var(--border)] 
          flex flex-col transition-all duration-300 ease-in-out
          w-72
          ${isMobileOpen ? 'translate-x-0 z-40' : '-translate-x-full lg:translate-x-0 lg:z-10'}
          ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
        `}
      >
        {/* Header con Logo */}
        <div className={`p-6 border-b border-[color:var(--border)] transition-all duration-300 ${isCollapsed ? 'lg:p-3' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            {isCollapsed ? (
              <div className="hidden lg:flex justify-center w-full">
                <Logo href="/app" size="md" showText={false} />
              </div>
            ) : (
              <>
                <Logo href="/app" size="md" />
                {/* Botón cerrar en móvil */}
                <button
                  onClick={closeMobile}
                  className="lg:hidden p-2 rounded-lg hover:bg-[color:var(--muted)] transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* User Info Card - Mejorada */}
        <div className="p-4 border-b border-[color:var(--border)]">
          {isCollapsed ? (
            // Modo colapsado: Solo avatar con iniciales
            <div className="lg:flex justify-center hidden" title={fullName || userEmail || 'Usuario'}>
              <div className="relative group cursor-pointer">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-pink-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <span className="text-base font-black text-white">
                    {getUserInitials()}
                  </span>
                </div>
                {subscription && (
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[color:var(--card)] shadow-lg" />
                )}
              </div>
            </div>
          ) : (
            // Modo expandido: Información completa
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-[color:var(--muted)]/50 to-[color:var(--muted)]/30 hover:from-[color:var(--muted)]/70 hover:to-[color:var(--muted)]/50 border border-[color:var(--border)]/50 transition-all duration-300">
              <div className="relative flex-shrink-0 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[color:var(--accent)] via-orange-500 to-pink-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                  <span className="text-base font-black text-white">
                    {getUserInitials()}
                  </span>
                </div>
                {subscription && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[color:var(--card)] shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Nombre completo - Principal */}
                <p className="text-sm font-bold text-[color:var(--foreground)] truncate mb-0.5">
                  {fullName || userEmail?.split('@')[0] || 'Usuario'}
                </p>
                {/* Email - Secundario (siempre se muestra si existe) */}
                {userEmail && (
                  <p className="text-[10px] text-[color:var(--muted-foreground)] truncate">
                    {userEmail}
                  </p>
                )}
                {/* Badge de suscripción */}
                {subscription ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                      {subscription.planName}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 inline-block text-[10px] text-[color:var(--muted-foreground)] opacity-60">
                    Sin plan activo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="mb-4">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)] mb-2">
                Navegación
              </p>
            )}
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isCollapsed ? 'lg:justify-center lg:px-3 lg:py-3' : ''}
                    ${active 
                      ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white shadow-lg shadow-[color:var(--accent)]/25' 
                      : 'text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--accent)]'
                    }
                  `}
                >
                  <Icon className={`${isCollapsed ? 'lg:w-6 lg:h-6 w-5 h-5' : 'w-5 h-5'} flex-shrink-0 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
                  {!isCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Notifications & Theme */}
          <div className="pt-4 border-t border-[color:var(--border)] space-y-1">
            <button
              type="button"
              onClick={() => {
                closeMobile();
                setIsNotificationsOpen(true);
              }}
              title={isCollapsed ? 'Notificaciones' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--accent)] transition-all duration-200 w-full ${isCollapsed ? 'lg:justify-center lg:px-3 lg:py-3' : ''}`}
            >
              <div className="relative">
                <Bell className={`${isCollapsed ? 'lg:w-6 lg:h-6 w-5 h-5' : 'w-5 h-5'} group-hover:scale-110 transition-transform`} />
                {notificationsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[color:var(--card)] animate-pulse" />
                )}
              </div>
              {!isCollapsed && (
                <>
                  <span>Notificaciones</span>
                  {notificationsCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {notificationsCount}
                    </span>
                  )}
                </>
              )}
            </button>
            
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isCollapsed ? `Tema: ${mode === 'light' ? 'Claro' : 'Oscuro'}` : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--accent)] transition-all duration-200 w-full ${isCollapsed ? 'lg:justify-center lg:px-3 lg:py-3' : ''}`}
            >
              {(() => {
                const ThemeIcon = getThemeIcon();
                return <ThemeIcon className={`${isCollapsed ? 'lg:w-6 lg:h-6 w-5 h-5' : 'w-5 h-5'} group-hover:scale-110 group-hover:rotate-12 transition-all`} />;
              })()}
              {!isCollapsed && (
                <>
                  <span>Tema</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-[color:var(--muted)] rounded-md font-semibold capitalize">
                    {mode === 'light' ? 'Claro' : 'Oscuro'}
                  </span>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* Footer con Logout */}
        <div className="p-4 border-t border-[color:var(--border)] space-y-2">
          {subscription && !isCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-1">
                Suscripción Activa
              </p>
              <p className="text-[9px] text-[color:var(--muted-foreground)]">
                Renueva: {subscription.renewalDate}
              </p>
            </div>
          )}
          
          <button
            type="button"
            onClick={onSignOut}
            disabled={isProcessing}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            className={`w-full group flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[color:var(--background)] border-2 border-[color:var(--border)] text-sm font-semibold text-[color:var(--foreground)] hover:border-red-500 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isCollapsed ? 'px-3 py-3' : 'px-4'}`}
          >
            <LogOut className={`${isCollapsed ? 'lg:w-5 lg:h-5 w-4 h-4' : 'w-4 h-4'} group-hover:translate-x-0.5 transition-transform`} />
            {!isCollapsed && <span>{isProcessing ? 'Cerrando...' : 'Cerrar Sesión'}</span>}
          </button>
        </div>
      </aside>

      {/* Notifications Panel */}
      <NotificationsPanel
        userId={user.id}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onCountChange={setNotificationsCount}
      />
    </>
  );
}
