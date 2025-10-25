'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  submenu?: {
    href: string;
    label: string;
  }[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/administrador', label: 'Dashboard', icon: '📊' },
  { 
    href: '/administrador/usuarios', 
    label: 'Usuarios', 
    icon: '👥'
  },
  {
    href: '/administrador/sorteos',
    label: 'Sorteos',
    icon: '🎁',
    submenu: [
      { href: '/administrador/sorteos', label: 'Todos los sorteos' },
      { href: '/administrador/sorteos?crear=true', label: 'Crear sorteo' },
      { href: '/administrador/sorteos/calendario', label: 'Calendario' },
    ],
  },
  { href: '/administrador/eventos-vivo', label: 'Eventos en vivo', icon: '🎬' },
  { href: '/administrador/planes', label: 'Planes', icon: '💎' },
  { href: '/administrador/ganadores', label: 'Ganadores', icon: '🏆' },
  { href: '/administrador/pagos', label: 'Pagos', icon: '💳' },
  { href: '/administrador/reportes', label: 'Reportes', icon: '📈' },
  { href: '/administrador/configuracion', label: 'Configuración', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleSubmenu = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/administrador') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-[color:var(--border)] bg-[color:var(--background)] transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-72'
        } lg:relative lg:z-auto`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-[color:var(--border)] px-4">
          {!collapsed && (
            <Link href="/administrador" className="flex items-center gap-3">
              <span className="text-2xl">🎰</span>
              <div>
                <p className="text-lg font-bold text-[color:var(--foreground)]">TuSuerte</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">Panel Admin</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
            aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedItems.includes(item.href);

              return (
                <li key={item.href}>
                  {hasSubmenu ? (
                    <>
                      <button
                        onClick={() => toggleSubmenu(item.href)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]'
                            : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]'
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <span className="text-xs transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              ▼
                            </span>
                          </>
                        )}
                      </button>
                      {!collapsed && isExpanded && (
                        <ul className="ml-8 mt-1 space-y-1 border-l-2 border-[color:var(--border)] pl-3">
                          {item.submenu.map((subItem) => (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={`block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                  pathname === subItem.href
                                    ? 'text-[color:var(--accent)]'
                                    : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]'
                          : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="mt-auto space-y-3 border-t border-[color:var(--border)] pt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
            >
              <span className="text-xl">🏠</span>
              {!collapsed && <span>Ver como usuario</span>}
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
