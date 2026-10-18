'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../theme/theme-toggle';
import { Logo } from '../ui/logo';
import { ButtonLink } from '../ui/kit';
import { useAuthContext } from '../auth/auth-provider';
import { getRedirectPath } from '../../lib/auth/roles';
import { PUBLIC_NAV_ITEMS } from '../../config/navigation';
import { cn } from '../../lib/utils';

type NavItem = { href: string; label: string };

type SiteHeaderProps = {
  navItems?: ReadonlyArray<NavItem>;
  /** @deprecated El botón de la cabecera se decide según la sesión */
  cta?: unknown;
};

export function SiteHeader({ navItems = PUBLIC_NAV_ITEMS }: Readonly<SiteHeaderProps>) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuthContext();

  // Cerrar el menú al navegar y bloquear el scroll mientras está abierto
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isActive = (href: string) => !href.includes('#') && (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  const accountActions = loading ? (
    <span className="h-10 w-28" aria-hidden />
  ) : user ? (
    <ButtonLink href={getRedirectPath(user.role)} size="md">
      <LayoutDashboard aria-hidden />
      Mi cuenta
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/iniciar-sesion" variant="ghost" size="md">
        Iniciar sesión
      </ButtonLink>
      <ButtonLink href="/registro" size="md">
        Crear cuenta
      </ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--background)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]',
                isActive(item.href) && 'text-[color:var(--foreground)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {accountActions}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="flex size-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-movil" className="border-t border-[color:var(--border)] bg-[color:var(--background)] lg:hidden">
          <nav aria-label="Principal (móvil)" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-[color:var(--border)] pt-4 [&>a]:w-full">{accountActions}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
