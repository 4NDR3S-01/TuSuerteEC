'use client';

import { useState } from "react";

export function HeroSection() {
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  return (
    <section
      id="inicio"
      className="scroll-mt-header relative overflow-hidden rounded-3xl border border-[color:var(--border)] px-4 py-10 sm:px-8 md:px-16"
      style={{ background: "var(--hero-gradient)" }}
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <span
            className="inline-flex max-w-max items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] sm:px-4"
            style={{ backgroundColor: "rgba(249, 115, 22, 0.12)", color: "var(--accent)" }}
          >
            TuSuerte | Sorteos en vivo
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            La plataforma de sorteos <span className="whitespace-nowrap">más confiable</span>
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
            Impulsa la participación y fideliza a tu comunidad con sorteos transparentes y seguros. ¡Participa
            en tu primer sorteo hoy mismo! 
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <a
              href="#planes"
              className="rounded-full px-5 py-3 text-sm font-semibold shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-6 sm:text-base"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              Ver planes
            </a>
            <a
              href="/iniciar-sesion"
              className="rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid var(--border)",
              }}
            >
              Inicia sesión
            </a>
          </div>
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setShowMobileDetails((prev) => !prev)}
              aria-expanded={showMobileDetails}
              className="group flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-[rgba(255,255,255,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span>¿Por qué elegir TuSuerte?</span>
              <svg
                className={`h-4 w-4 transition-transform ${showMobileDetails ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.24 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" />
              </svg>
            </button>
            {showMobileDetails && (
              <div className="mt-3 space-y-3 rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.2)] p-4 text-sm text-[color:var(--muted-foreground)]">
                <p>
                  Tecnología transparente para sorteos en vivo y una experiencia fluida para tus participantes.
                </p>
                <ul className="space-y-2">
                  <li>• Plataforma intuitiva y 100% verificable.</li>
                  <li>• Premios irresistibles para aumentar la participación.</li>
                  <li>• Seguridad reforzada para tu comunidad.</li>
                </ul>
                <p className="text-xs font-medium text-[color:var(--accent)]">
                  Únete y maximiza tus sorteos desde el primer día.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="hidden flex-1 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(255,255,255,0.24)] p-5 backdrop-blur sm:p-6 md:block md:p-10">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold sm:text-3xl">¿Por qué elegir TuSuerte?</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              TuSuerte utiliza tecnología avanzada para ofrecer una experiencia óptima en sorteos. Siendo una plataforma intuitiva y fácil de usar, facilitando la participación en los sorteos.
            </p>
            <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)]">
              <li>• Somos una plataforma 100% transparente.</li>
              <li>• Ofrecemos premios atractivos para incentivar la participación.</li>
              <li>• Garantizamos la seguridad de tus datos y los de tus participantes.</li>
            </ul>
            <p className="text-sm font-medium text-[color:var(--accent)]">
              ¡Únete a miles de usuarios satisfechos y comienza a ganar hoy mismo!
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">— Equipo de TuSuerte</p>
          </div>
        </div>
      </div>
    </section>
  );
}
