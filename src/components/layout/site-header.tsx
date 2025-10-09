'use client';

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [menuTopOffset, setMenuTopOffset] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement | null>(null);
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

  const hamburgerLabel = isMenuOpen ? "Cerrar navegación" : "Abrir navegación";
  const lineBase =
    "pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[color:var(--foreground)] transition-all duration-300 ease-out";

  const updateMenuOffset = useCallback(() => {
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
    const announcementElement = document.querySelector("[data-announcement-bar]");
    let announcementHeight = 0;

    if (announcementElement) {
      const rect = announcementElement.getBoundingClientRect();
      if (rect.bottom > 0) {
        announcementHeight = rect.height;
      }
    }

    let offset = headerHeight + announcementHeight + 16;

    if (typeof window !== "undefined") {
      const viewportHeight = window.innerHeight || 0;
      const maxOffset = Math.max(viewportHeight - 120, 0);
      offset = Math.min(offset, maxOffset);
    }

    setMenuTopOffset(offset);
  }, []);

  useEffect(() => {
    updateMenuOffset();
    window.addEventListener("resize", updateMenuOffset);
    return () => {
      window.removeEventListener("resize", updateMenuOffset);
    };
  }, [updateMenuOffset]);

  useEffect(() => {
    if (isMenuOpen) {
      updateMenuOffset();
      const handleScroll = () => updateMenuOffset();
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isMenuOpen, updateMenuOffset]);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[color:var(--border)] backdrop-blur transition-colors"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          ref={headerRef}
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-10"
        >
          <Link href="/#inicio" className="text-lg font-semibold tracking-tight sm:text-xl">
            TuSuerte
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
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
                className="hidden whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5 lg:inline-flex"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {finalCta.label}
              </Link>
            ) : null}
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] text-base shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] lg:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={hamburgerLabel}
              onClick={toggleMenu}
            >
              <span
                aria-hidden="true"
                className={`${lineBase} ${
                  isMenuOpen ? "translate-y-0 rotate-45" : "-translate-y-2"
                }`}
              />
              <span
                aria-hidden="true"
                className={`${lineBase} ${isMenuOpen ? "opacity-0" : "opacity-100"}`}
              />
              <span
                aria-hidden="true"
                className={`${lineBase} ${
                  isMenuOpen ? "translate-y-0 -rotate-45" : "translate-y-2"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <dialog
          open
          className="fixed inset-0 z-40 p-0 bg-transparent lg:hidden"
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
            className="absolute inset-x-4 flex h-full flex-col gap-6 overflow-y-auto rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)]/95 p-6 pb-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:inset-x-8"
            style={{
              top: `calc(${menuTopOffset}px + env(safe-area-inset-top))`,
              maxHeight: `calc(100vh - ${menuTopOffset + 24}px)`
            }}
          >
            <nav className="grid gap-3 text-sm font-semibold text-[color:var(--foreground)]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-transparent px-4 py-3 transition-colors hover:border-[color:var(--border)] hover:bg-[color:var(--background)]"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {finalCta ? (
              <Link
                href={finalCta.href}
                className="flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                onClick={closeMenu}
              >
                {finalCta.label}
              </Link>
            ) : null}
            <div className="mt-auto space-y-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:rgba(249,115,22,0.08)] px-4 py-5 text-xs text-[color:var(--muted-foreground)]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">¿Necesitas ayuda inmediata?</p>
                <p>Estamos disponibles 24/7 para resolver incidencias de sorteos y retiros.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="tel:+593963924479"
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
                  onClick={closeMenu}
                >
                  Llamar ahora
                </a>
                <a
                  href="mailto:soporte@tusuerte.com"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                  onClick={closeMenu}
                >
                  Escribir a soporte
                </a>
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
