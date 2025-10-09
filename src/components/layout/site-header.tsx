'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";

type NavItem = {
  href: string;
  label: string;
};

type HeaderCta = {
  href: string;
  label: string;
};

type SiteHeaderProps = {
  navItems: ReadonlyArray<NavItem>;
  cta?: HeaderCta | null;
};

export function SiteHeader({ navItems, cta }: Readonly<SiteHeaderProps>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const finalCta = cta === undefined ? { href: "/iniciar-sesion", label: "Iniciar sesión" } : cta;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((value) => !value);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[color:var(--border)] backdrop-blur transition-colors"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6">
          <Link href="/#inicio" className="text-lg font-semibold tracking-tight sm:text-xl">
            TuSuerte
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[color:var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            {finalCta ? (
              <Link
                href={finalCta.href}
                className="hidden rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5 md:inline-flex"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {finalCta.label}
              </Link>
            ) : null}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] text-base shadow-sm transition-transform hover:-translate-y-0.5 md:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={toggleMenu}
            >
              <span aria-hidden="true">{isMenuOpen ? "✕" : "☰"}</span>
              <span className="sr-only">Abrir menú</span>
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <dialog
          open
          className="fixed inset-0 z-40 md:hidden p-0 bg-transparent"
          id="mobile-navigation-dialog"
          aria-modal="true"
          style={{ border: "none", padding: 0, margin: 0, maxWidth: "none", width: "100vw", height: "100vh" }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar menú"
            tabIndex={0}
            onClick={closeMenu}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                closeMenu();
              }
            }}
            style={{ cursor: "pointer", border: "none", background: "rgba(0,0,0,0.45)" }}
          />
          <div
            id="mobile-navigation"
            className="absolute left-4 right-4 top-20 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.55)]"
          >
            <nav className="flex flex-col gap-4 text-sm font-semibold text-[color:var(--foreground)]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-3 transition-colors hover:bg-[color:var(--background)]"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {finalCta ? (
              <Link
                href={finalCta.href}
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                onClick={closeMenu}
              >
                {finalCta.label}
              </Link>
            ) : null}
          </div>
        </dialog>
      ) : null}
    </>
  );
}
