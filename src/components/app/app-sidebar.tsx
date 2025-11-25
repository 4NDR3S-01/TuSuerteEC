'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '../ui/logo';
import { useSidebar } from '../../hooks/use-sidebar';
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
  ChevronRight
} from 'lucide-react';

type User = {
  id: string;
  email: string;
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
  const { isCollapsed, setIsCollapsed } = useSidebar();

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
        style={{ left: isCollapsed ? '64px' : '288px' }}
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
          ${isCollapsed ? 'lg:w-16' : 'lg:w-72'}
        `}
      >
        {/* Header con Logo */}
        <div className={`p-6 border-b border-[color:var(--border)] transition-all duration-300 ${isCollapsed ? 'lg:p-3' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            {isCollapsed ? (
              <div className="hidden lg:flex justify-center w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-orange-500 flex items-center justify-center">
                  <span className="text-xl font-black text-white">T</span>
                </div>
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

        {/* User Info Card */}
        <div className="p-4 border-b border-[color:var(--border)]">
          <div className={`flex items-start gap-3 p-3 rounded-xl bg-[color:var(--muted)]/50 hover:bg-[color:var(--muted)] transition-colors ${isCollapsed ? 'lg:justify-center lg:p-2' : ''}`}>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-orange-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
              {subscription && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[color:var(--card)]" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[color:var(--foreground)] truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-[color:var(--muted-foreground)] font-mono mt-0.5">
                  ID: {user.id.slice(0, 8)}
                </p>
                {subscription ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                      {subscription.planName}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-[color:var(--muted-foreground)]">
                    Sin suscripción
                  </p>
                )}
              </div>
            )}
          </div>
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
                    ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                    ${active 
                      ? 'bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white shadow-lg shadow-[color:var(--accent)]/25' 
                      : 'text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--accent)]'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
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

          {/* Notifications Badge */}
          <div className="pt-4 border-t border-[color:var(--border)]">
            <Link
              href="/app/notificaciones"
              onClick={closeMobile}
              title={isCollapsed ? 'Notificaciones' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--accent)] transition-all duration-200 ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
            >
              <div className="relative">
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[color:var(--card)] animate-pulse" />
              </div>
              {!isCollapsed && (
                <>
                  <span>Notificaciones</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    3
                  </span>
                </>
              )}
            </Link>
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
            className={`w-full group flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[color:var(--background)] border-2 border-[color:var(--border)] text-sm font-semibold text-[color:var(--foreground)] hover:border-red-500 hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isCollapsed ? 'px-2' : 'px-4'}`}
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            {!isCollapsed && <span>{isProcessing ? 'Cerrando...' : 'Cerrar Sesión'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
