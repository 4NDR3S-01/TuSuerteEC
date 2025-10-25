'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  submenu?: {
    href: string;
    label: string;
  }[];
};

// Staff solo tiene acceso a sorteos, eventos y ganadores
const NAV_ITEMS: NavItem[] = [
  { href: '/staff', label: 'Dashboard', icon: '📊' },
  {
    href: '/staff/sorteos',
    label: 'Sorteos',
    icon: '🎁',
    submenu: [
      { href: '/staff/sorteos', label: 'Sorteos activos' },
      { href: '/staff/sorteos/ejecutar', label: 'Ejecutar sorteo' },
    ],
  },
  { href: '/staff/eventos-vivo', label: 'Eventos en vivo', icon: '🎬' },
  { href: '/staff/ganadores', label: 'Ganadores', icon: '🏆' },
];

export function StaffSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleSubmenu = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/staff') {
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
            <Link href="/staff" className="flex items-center gap-3">
              <span className="text-2xl">🎰</span>
              <div>
                <p className="text-lg font-bold text-[color:var(--foreground)]">TuSuerte</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">Panel Staff</p>
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
                      {!collapsed && <span className="flex-1">{item.label}</span>}
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
