import Link from 'next/link';
import { SiteHeader } from '../../../components/layout/site-header';
import { PUBLIC_NAV_ITEMS } from '../../../config/navigation';
import { FAQS, SUPPORT_CHANNELS } from '../../../config/help';
import React from 'react';
import { User, BadgeCheck, Trophy, HelpCircle, ShieldCheck, FileText } from "lucide-react";

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

const QUICK_HELP_LINKS = [
  {
    icon: HelpCircle,
    label: 'Contactar soporte',
    description: 'Habla con el equipo o agenda una llamada.',
    href: '#contacto',
  },
  {
    icon: ShieldCheck,
    label: 'Seguridad y transparencia',
    description: 'Conoce cómo protegemos cada sorteo.',
    href: '/sobre-nosotros#seguridad',
  },
  {
    icon: FileText,
    label: 'Guía de participación',
    description: 'Pasos claves y requisitos para participar.',
    href: '#faq',
  },
] as const;


export default function AyudaPage() {
  const slugify = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-');
  const faqEntries = FAQS.map((item) => ({
    ...item,
    id: `q-${slugify(item.question)}`,
  }));

  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 md:px-10">
      <section className="space-y-12">
        {/* Hero */}
        <div className="space-y-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Centro de ayuda
          </span>
          <h1 className="text-3xl font-semibold md:text-4xl">
            ¿En qué podemos ayudarte hoy?
          </h1>
          <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
            Encuentra respuestas claras o ponte en contacto con nuestro equipo. Mantuvimos todo lo esencial para que recibas ayuda sin distracciones.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK_HELP_LINKS.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[rgba(249,115,22,0.12)]">
                    <Icon className="h-4 w-4 text-[color:var(--accent)]" />
                  </span>
                  <span className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">{action.label}</p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">{action.description}</p>
                  </span>
                </>
              );

              if (action.href.startsWith('/')) {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 text-left transition-colors hover:border-[color:var(--accent)]/60"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 text-left transition-colors hover:border-[color:var(--accent)]/60"
                >
                  {content}
                </a>
              );
            })}
          </div>
          <form className="max-w-lg" action="#faq">
            <input
              type="search"
              name="query"
              placeholder="Busca temas como pagos, sorteos o planes..."
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
            />
          </form>
        </div>

        {/* Guía rápida de inicio */}
        <div id="primeros-pasos" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold md:text-3xl">Primeros pasos rápidos</h2>
            <p className="max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Tres acciones para comenzar a participar en los sorteos sin complicaciones.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3" role="list">
            {QUICK_START_STEPS.map((step) => (
              <li
                key={step.number}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(249,115,22,0.12)] text-2xl">
                  {step.icon}
                </div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* FAQ + Canales de soporte */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div id="faq" className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold md:text-3xl">Preguntas frecuentes</h2>
              <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">
                Las respuestas a las dudas más comunes de nuestros usuarios
              </p>
            </div>

            {/* FAQ accesible usando <details> para soporte de enlazado por id */}
            <div className="space-y-3">
              {faqEntries.map((item) => (
                <details
                  key={item.id}
                  id={item.id}
                  className="group rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4"
                  aria-labelledby={`${item.id}-label`}
                >
                  <summary
                    id={`${item.id}-label`}
                    className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold transition-colors group-open:text-[color:var(--accent)]"
                  >
                    <span>{item.question}</span>
                    <span className="ml-auto text-xl text-[color:var(--muted-foreground)] transition-transform group-open:rotate-180" aria-hidden>
                      ▼
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-sm text-[color:var(--muted-foreground)]">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Sidebar: Canales de soporte */}
          <aside className="flex w-full flex-col gap-6 self-start lg:sticky lg:top-4">
            <section id="contacto" className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="text-lg font-semibold">¿Necesitas más ayuda?</h3>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Elige un canal y un miembro del equipo se comunicará contigo a la brevedad.
              </p>

              <dl className="mt-4 space-y-2 text-xs text-[color:var(--muted-foreground)]">
                <div className="flex items-center justify-between">
                  <dt className="font-semibold text-[color:var(--foreground)]">Horario</dt>
                  <dd>Lunes a viernes · 09h00 – 18h00</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-semibold text-[color:var(--foreground)]">Tiempo de respuesta</dt>
                  <dd>Menos de 15 minutos</dd>
                </div>
              </dl>

              <div className="mt-5 space-y-3">
                {SUPPORT_CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <a
                      key={channel.title}
                      href={channel.href}
                      className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] px-3 py-3 transition-colors hover:border-[color:var(--accent)]/60"
                    >
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[rgba(249,115,22,0.12)]">
                        <Icon className="h-5 w-5 text-[color:var(--accent)]" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{channel.title}</p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{channel.description}</p>
                        <span className="text-xs font-semibold text-[color:var(--accent)]">{channel.label}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* CTA adicional */}
            <div className="rounded-lg border border-dashed border-[color:var(--border)] p-5">
              <p className="mb-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Consejo útil
              </p>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                ¿Primera vez en TuSuerte? Conoce los beneficios de crear una cuenta gratuita.
              </p>
              <a href="/registro" className="mt-3 inline-flex text-sm font-semibold text-[color:var(--accent)] hover:underline">
                Crear cuenta gratis
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
            mainEntity: faqEntries.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
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
