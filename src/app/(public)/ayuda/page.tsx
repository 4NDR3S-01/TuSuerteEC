import { SiteHeader } from '../../../components/layout/site-header';
import { PUBLIC_NAV_ITEMS } from '../../../config/navigation';
import { FAQS, SUPPORT_CHANNELS } from '../../../config/help';
import React from 'react';

export const metadata = {
  title: 'Ayuda y Soporte · TuSuerte',
  description:
    'Centro de ayuda de TuSuerte: preguntas frecuentes, guías rápidas y canales de soporte para resolver tus dudas al instante.',
};

const QUICK_START_STEPS = [
  {
    number: '1',
    title: 'Crea tu cuenta',
    description: 'Regístrate gratis con tu correo electrónico en menos de 2 minutos.',
    icon: '👤',
  },
  {
    number: '2',
    title: 'Elige un plan',
    description: 'Selecciona el plan que mejor se adapte a tus necesidades o participa gratis.',
    icon: '🎯',
  },
  {
    number: '3',
    title: 'Participa y gana',
    description: 'Inscríbete en sorteos activos y espera los resultados en vivo.',
    icon: '🏆',
  },
] as const;

export default function AyudaPage() {
  const slugify = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-');

  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 md:px-10">
      <section className="space-y-12">
        {/* Hero */}
        <div className="space-y-3 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Centro de ayuda
          </span>
          <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            ¿En qué podemos ayudarte?
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[color:var(--muted-foreground)]">
            Encuentra respuestas rápidas a tus preguntas o contacta a nuestro equipo de soporte. 
            Estamos aquí para hacer tu experiencia perfecta.
          </p>
        </div>

        {/* Guía rápida de inicio */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Guía rápida de inicio</h2>
            <p className="mt-2 text-[color:var(--muted-foreground)]">
              Tres pasos simples para comenzar a participar
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {QUICK_START_STEPS.map((step) => (
              <div
                key={step.number}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:border-[color:var(--accent)]/50 hover:shadow-lg"
              >
                <div className="absolute -right-4 -top-4 text-8xl font-bold opacity-5">
                  {step.number}
                </div>
                <div className="relative">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(249,115,22,0.12)] text-3xl transition-transform group-hover:scale-110">
                    {step.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-[color:var(--muted-foreground)]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ + Canales de soporte */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Preguntas frecuentes</h2>
              <p className="mt-2 text-[color:var(--muted-foreground)]">
                Las respuestas a las dudas más comunes de nuestros usuarios
              </p>
            </div>

            {/* Tabla de contenido rápida */}
            <nav aria-label="Índice de preguntas" className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Índice rápido</h3>
              <ul className="grid gap-2 text-sm">
                {FAQS.map((f) => {
                  const id = `q-${slugify(f.question)}`;
                  return (
                    <li key={id}>
                      <a href={`#${id}`} className="text-[color:var(--accent)] transition-colors hover:underline">
                        → {f.question}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* FAQ accesible usando <details> para soporte de enlazado por id */}
            <div className="space-y-3">
              {FAQS.map((item) => {
                const id = `q-${slugify(item.question)}`;
                return (
                  <details 
                    key={id} 
                    id={id} 
                    className="group rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 transition-all hover:border-[color:var(--accent)]/30" 
                    aria-labelledby={`${id}-label`}
                  >
                    <summary 
                      id={`${id}-label`} 
                      className="flex cursor-pointer items-center justify-between font-semibold transition-colors group-hover:text-[color:var(--accent)]"
                    >
                      <span>{item.question}</span>
                      <span className="ml-4 text-xl transition-transform group-open:rotate-180" aria-hidden>
                        ▼
                      </span>
                    </summary>
                    <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-sm text-[color:var(--muted-foreground)]">
                      {item.answer}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Canales de soporte */}
          <aside className="flex w-full flex-col gap-6 self-start lg:sticky lg:top-4">
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">¿Necesitas más ayuda?</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Nuestro equipo de soporte está listo para atenderte. Elige el canal que prefieras.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {SUPPORT_CHANNELS.map((channel) => (
                  <a
                    key={channel.title}
                    href={channel.href}
                    className="group flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/85 p-4 transition-all hover:border-[color:var(--accent)]/50 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(249,115,22,0.12)] text-xl transition-transform group-hover:scale-110">
                        {channel.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-[color:var(--foreground)]">{channel.title}</p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{channel.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)] transition-colors group-hover:gap-2">
                      {channel.label} <span aria-hidden>→</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* CTA adicional */}
            <div className="rounded-2xl border border-dashed border-[color:var(--accent)]/50 bg-gradient-to-br from-[rgba(249,115,22,0.08)] to-transparent p-6">
              <p className="mb-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                💡 Consejo útil
              </p>
              <p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
                ¿Primera vez en TuSuerte? Lee nuestra guía rápida y empieza a participar en minutos.
              </p>
              <a
                href="/registro"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)] hover:underline"
              >
                Crear cuenta gratis <span aria-hidden>→</span>
              </a>
            </div>
          </aside>
        </div>
      </section>
    
      {/* JSON-LD para FAQ (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.answer,
              },
            })),
          }),
        }}
      />
    </main>
      <footer className="border-t border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-[color:var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TuSuerte. Todos los derechos reservados.</p>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-[color:var(--accent)]" href="https://www.instagram.com/andres.cabrera20/">
              Desarrollado con ❤️ por William Cabrera
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
