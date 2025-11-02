import { SiteHeader } from '../../../components/layout/site-header';
import { PUBLIC_NAV_ITEMS } from '../../../config/navigation';
import { FAQS, SUPPORT_CHANNELS } from '../../../config/help';
import React from 'react';
import { User, BadgeCheck, Trophy } from "lucide-react";

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
    icon: <User className="w-6 h-6 text-[color:var(--accent)]" />,
  },
  {
    number: '2',
    title: 'Elige un plan',
    description: 'Selecciona el plan que mejor se adapte a tus necesidades o participa gratis.',
    icon: <BadgeCheck className="w-6 h-6 text-[color:var(--accent)]" />,
  },
  {
    number: '3',
    title: 'Participa y gana',
    description: 'Inscríbete en sorteos activos y espera los resultados en vivo.',
    icon: <Trophy className="w-6 h-6 text-[color:var(--accent)]" />,
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
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-12 shadow-lg sm:px-10 md:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--accent)_0%,transparent_55%)] opacity-20" aria-hidden />
          <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-gradient-to-l from-[rgba(249,115,22,0.15)] to-transparent sm:block" aria-hidden />
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)]/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] backdrop-blur">
              Centro de ayuda
            </div>
            <div className="space-y-4">
              <h1 className="text-left text-3xl font-semibold md:text-4xl lg:text-5xl">
                Resolver tus dudas es nuestra prioridad
              </h1>
              <p className="text-base text-[color:var(--muted-foreground)] md:text-lg">
                Consulta preguntas frecuentes, aprende a configurar tu cuenta o habla directamente con nuestro equipo. Diseñamos este centro para que encuentres respuestas en segundos.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5 hover:bg-[color:var(--accent)]/90"
              >
                Contactar soporte
              </a>
              <a
                href="#faq"
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--accent)]/60"
              >
                Ver preguntas frecuentes
              </a>
            </div>
            <form
              className="relative mt-6 max-w-xl"
              action="#faq"
            >
              <input
                type="search"
                name="query"
                placeholder="Busca temas como pagos, sorteos o planes..."
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/80 px-5 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/40"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Enter ↵
              </span>
            </form>
            <div className="flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)]/40 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Tiempo medio de respuesta: <strong>menos de 15 min</strong>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)]/40 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Más de <strong>1.200+ consultas resueltas</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Guía rápida de inicio */}
        <div id="primeros-pasos" className="space-y-8">
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Comienza en minutos</h2>
            <p className="mx-auto max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Sigue estos pasos para tener todo listo. Cada tarjeta incluye enlaces y recomendaciones pensadas para usuarios nuevos.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-[color:var(--muted-foreground)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)]/40 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Onboarding guiado 24/7
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)]/40 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden /> Soporte personalizado en cada paso
              </span>
            </div>
          </div>
          <ol className="grid gap-6 md:grid-cols-3" role="list">
            {QUICK_START_STEPS.map((step) => (
              <li
                key={step.number}
                className="group relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)]/90 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[color:var(--accent)]/60 hover:shadow-xl"
              >
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/40 to-transparent" aria-hidden />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)]/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                      Paso {step.number}
                    </span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-2xl transition-transform group-hover:scale-110">
                      {step.icon}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-[color:var(--muted-foreground)]">{step.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                    <span className="rounded-full border border-[color:var(--border)] px-2 py-1 uppercase tracking-wide">
                      Recomendado
                    </span>
                    <span>Tiempo estimado: <strong>2 minutos</strong></span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* FAQ + Canales de soporte */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div id="faq" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold md:text-3xl">Preguntas frecuentes</h2>
              <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">
                Las respuestas a las dudas más comunes de nuestros usuarios
              </p>
            </div>

            {/* Tabla de contenido rápida */}
            <nav
              aria-label="Índice de preguntas"
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
                  Índice rápido
                </h3>
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  Haz clic para ir directo
                </span>
              </div>
              <ul className="mt-4 grid gap-2 text-sm">
                {FAQS.map((f) => {
                  const id = `q-${slugify(f.question)}`;
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-[color:var(--muted-foreground)] transition-all hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--accent)]"
                      >
                        <span aria-hidden>→</span> {f.question}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* FAQ accesible usando <details> para soporte de enlazado por id */}
            <div className="space-y-4">
              {FAQS.map((item) => {
                const id = `q-${slugify(item.question)}`;
                return (
                  <details 
                    key={id} 
                    id={id} 
                    className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)]/50 open:border-[color:var(--accent)]/60 open:shadow-lg" 
                    aria-labelledby={`${id}-label`}
                  >
                    <summary 
                      id={`${id}-label`} 
                      className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold transition-colors group-open:text-[color:var(--accent)] group-hover:text-[color:var(--accent)]"
                    >
                      <span>{item.question}</span>
                      <span className="ml-auto text-xl transition-transform group-open:rotate-180" aria-hidden>
                        ▼
                      </span>
                    </summary>
                    <div className="mt-4 border-t border-[color:var(--border)] pt-4 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                      {item.answer}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Canales de soporte */}
          <aside className="flex w-full flex-col gap-6 self-start lg:sticky lg:top-4">
            <section
              id="contacto"
              className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)]/70 p-6 shadow-lg"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--accent),transparent_65%)] opacity-10" aria-hidden />
              <div className="relative space-y-5">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--background)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
                    Soporte experto
                  </span>
                  <h3 className="text-xl font-semibold leading-tight">¿Necesitas más ayuda?</h3>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    Estamos listos para resolver tus dudas por el canal que prefieras. Elige una opción y un especialista te atenderá al instante.
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs text-[color:var(--muted-foreground)]">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-3">
                    <dt className="font-semibold text-[color:var(--foreground)]">Horario</dt>
                    <dd>Lunes a viernes <br /> 09h00 – 18h00</dd>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-3">
                    <dt className="font-semibold text-[color:var(--foreground)]">Tiempo medio</dt>
                    <dd>Resolvemos en menos de 15 minutos</dd>
                  </div>
                </dl>

                <div className="grid gap-4">
                  {SUPPORT_CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <a
                        key={channel.title}
                        href={channel.href}
                        className="group flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/85 p-4 transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-xl transition-transform group-hover:scale-110">
                            <Icon className="h-6 w-6 text-[color:var(--accent)]" />
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold text-[color:var(--foreground)]">{channel.title}</p>
                            <p className="text-xs text-[color:var(--muted-foreground)]">{channel.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)] transition-all group-hover:gap-2">
                          {channel.label} <span aria-hidden>→</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>

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
            <a
              className="hover:text-[color:var(--accent)] transition-colors"
              href="https://www.instagram.com/andres.cabrera20/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Desarrollado con ❤️ por{" "}
              <span className="font-semibold">William Cabrera</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
