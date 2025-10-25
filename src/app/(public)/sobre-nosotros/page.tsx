import { SiteHeader } from '../../../components/layout/site-header';
import { PUBLIC_NAV_ITEMS } from '../../../config/navigation';
import React from 'react';

export const metadata = {
  title: 'Sobre nosotros · TuSuerte',
  description: 'Conoce al equipo detrás de TuSuerte, nuestra misión y cómo garantizamos la transparencia en cada sorteo digital.',
};

const VALUES = [
  {
    icon: '🎯',
    title: 'Transparencia total',
    description: 'Cada sorteo con algoritmo auditado y actas firmadas. Sin letra pequeña.',
  },
  {
    icon: '🔒',
    title: 'Seguridad primero',
    description: 'Protección de datos de nivel bancario. Tu información siempre segura.',
  },
  {
    icon: '⚡',
    title: 'Innovación continua',
    description: 'Mejoramos la plataforma cada semana basados en feedback real.',
  },
  {
    icon: '🤝',
    title: 'Comunidad unida',
    description: 'Miles de participantes comparten la emoción de cada sorteo.',
  },
] as const;

const MILESTONES = [
  { year: '2024', label: 'Fundación', detail: 'A finales del año 2024 nace TuSuerte con la misión de democratizar sorteos' },
  { year: '2025', label: 'Lanzamiento', detail: 'Lanzamiento de la plataforma TuSuerte y primeros sorteos' },
  { year: '2026', label: 'Futuro esperado', detail: 'Una gran comunidad y lanzamientos   de nuevas características' },
] as const;

export default function SobreNosotrosPage() {
  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 md:px-10">
      <section className="space-y-12">
        {/* Hero section */}
        <div className="space-y-3">
          <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Sobre nosotros
          </span>
          <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            Transformamos sorteos en experiencias inolvidables
          </h1>
          <p className="max-w-3xl text-lg text-[color:var(--muted-foreground)]">
            Somos el puente entre la emoción tradicional de ganar y la tecnología moderna. 
            Cada sorteo es una oportunidad de crear momentos únicos.
          </p>
        </div>

        {/* Historia + Compromisos */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Nuestra historia</h2>
            <p className="text-[color:var(--muted-foreground)]">
              TuSuerte nació para transformar sorteos tradicionales en experiencias digitales que
              enamoran. Combinamos storytelling, data y automatización para que cada sorteo sea
              memorable, transparente y escalable.
            </p>
            <p className="text-[color:var(--muted-foreground)]">
              Nuestro equipo multidisciplinario trabaja incansablemente para ofrecer una plataforma 
              robusta, intuitiva y segura, donde participantes se conectan a través de la emoción de ganar. 
              Más que sorteos, creamos momentos que inspiran y unen a las personas.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Nuestros compromisos</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
                <p className="font-semibold">Compromiso con la transparencia</p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  Nos tomamos muy en serio la confianza. Cada sorteo se realiza con un algoritmo
                  auditado y almacenamos actas firmadas.
                </p>
              </div>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-4">
                <p className="font-semibold">Tecnología confiable y escalable</p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  Construida sobre tecnología de vanguardia, nuestra plataforma garantiza velocidad,
                  seguridad y escalabilidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Nuestros valores</h2>
            <p className="mt-2 text-[color:var(--muted-foreground)]">
              Los principios que guían cada decisión que tomamos
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:border-[color:var(--accent)]/50 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(249,115,22,0.12)] text-2xl transition-transform group-hover:scale-110">
                  {value.icon}
                </div>
                <h3 className="mb-2 font-semibold">{value.title}</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Nuestro recorrido</h2>
            <p className="mt-2 text-[color:var(--muted-foreground)]">
              Hitos clave en la evolución de TuSuerte
            </p>
          </div>
          <div className="relative">
            {/* Línea de tiempo */}
            <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-[color:var(--accent)] to-transparent" />
            
            <div className="space-y-8">
              {MILESTONES.map((milestone, idx) => (
                <div key={milestone.year} className="relative grid gap-6 md:grid-cols-2">
                  {/* Dot */}
                  <div className="absolute left-1/2 top-6 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[color:var(--background)] bg-[color:var(--accent)]" />
                  
                  {idx % 2 === 0 ? (
                    <>
                      <div className="text-right md:pr-12">
                        <div className="inline-block rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
                          <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                            {milestone.year}
                          </p>
                          <p className="mt-1 font-semibold">{milestone.label}</p>
                          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                            {milestone.detail}
                          </p>
                        </div>
                      </div>
                      <div className="md:pl-12" />
                    </>
                  ) : (
                    <>
                      <div className="md:pr-12" />
                      <div className="md:pl-12">
                        <div className="inline-block rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
                          <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                            {milestone.year}
                          </p>
                          <p className="mt-1 font-semibold">{milestone.label}</p>
                          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                            {milestone.detail}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA mejorado */}
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-gradient-to-br from-[rgba(249,115,22,0.1)] to-[rgba(251,146,60,0.05)] p-8 md:p-12">
          {/* Decoración de fondo */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
          
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">
              ¿Listo para participar en sorteos emocionantes?
            </h2>
            <p className="mt-4 text-[color:var(--muted-foreground)]">
              Únete a miles de participantes que confían en TuSuerte. Crea tu cuenta gratis 
              y comienza a vivir la emoción de ganar premios increíbles hoy mismo.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/registro"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-xl"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <span>Crear cuenta gratis</span>
                <span aria-hidden>→</span>
              </a>
              <a
                href="/iniciar-sesion"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-6 py-3 font-semibold transition-all hover:-translate-y-0.5"
              >
                <span>Ya tengo cuenta</span>
              </a>
            </div>
            <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">
              Sin tarjeta de crédito requerida · Acceso instantáneo
            </p>
          </div>
        </div>
      </section>
    </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'TuSuerte',
            url: 'https://tusuerte.example',
            sameAs: ['https://www.instagram.com/tusuerte'],
            description: 'Plataforma de sorteos digitales que prioriza transparencia y seguridad.',
          }),
        }}
      />
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
