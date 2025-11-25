import Link from 'next/link';
import { SiteHeader } from '../../../components/layout/site-header';
import { PUBLIC_NAV_ITEMS } from '../../../config/navigation';
import React from 'react';
import {
  Compass,
  Database,
  FileText,
  FlaskConical,
  Handshake,
  Scale,
  ShieldCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Sobre nosotros · TuSuerte',
  description: 'Conoce al equipo detrás de TuSuerte, nuestra misión y cómo garantizamos la transparencia en cada sorteo digital.',
};

const TRUST_POINTS = [
  {
    Icon: FileText,
    title: 'Actas públicas',
    description:
      'Generamos un expediente digital por sorteo y compartimos extractos bajo solicitud para que cualquiera pueda verificar el resultado.',
  },
  {
    Icon: ShieldCheck,
    title: 'Infraestructura segura',
    description:
      'Aplicamos cifrado, monitoreo y copias de seguridad periódicas; trabajamos con proveedores certificados y auditables.',
  },
  {
    Icon: Scale,
    title: 'Cumplimiento legal',
    description:
      'Nuestros términos, bases y reglamentos se revisan con asesoría legal externa; cada campaña se ejecuta bajo contratos claros.',
  },
] as const;

const VALUES = [
  {
    Icon: Compass,
    title: 'Claridad primero',
    description:
      'Explicamos el proceso, los costos y los tiempos antes de iniciar cada campaña. Nada queda fuera del alcance de patrocinadores o comunidad.',
  },
  {
    Icon: Database,
    title: 'Custodia de datos',
    description:
      'Implementamos controles de acceso, políticas de retención y anonimización cuando corresponde para reducir riesgo.',
  },
  {
    Icon: FlaskConical,
    title: 'Iteración responsable',
    description:
      'Solo liberamos cambios que hayan pasado por pruebas con usuarios reales y documentación interna; preferimos avances seguros a saltos improvisados.',
  },
  {
    Icon: Handshake,
    title: 'Colaboración abierta',
    description:
      'Escuchamos y respondemos: patrocinadores, ganadores y aliados tienen canales directos para sugerir mejoras y reportar hallazgos.',
  },
] as const;

const MILESTONES = [
  {
    year: '2024',
    label: 'Fundación',
    detail: 'Nace TuSuerte con la misión de democratizar sorteos digitales transparentes en toda Latinoamérica.',
  },
  {
    year: '2025',
    label: 'Lanzamiento',
    detail: 'Lanzamos la primera versión de la plataforma, cerramos alianzas con comercios locales y realizamos los primeros sorteos oficiales.',
  },
  {
    year: '2026',
    label: 'Futuro próximo',
    detail: 'Expandimos la comunidad con sorteos en vivo, experiencias gamificadas y beneficios exclusivos para suscriptores.',
  },
] as const;

export default function SobreNosotrosPage() {
  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 md:px-10">
        <section className="space-y-16">
          {/* Hero */}
          <div className="space-y-5">
            <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
              Sobre nosotros
            </span>
            <h1 className="text-3xl font-semibold md:text-4xl lg:text-5xl">Operamos sorteos digitales auditables</h1>
            <p className="max-w-3xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Nos especializamos en ejecutar sorteos para marcas y comunidades con un proceso controlado de punta a punta:
              bases claras, inscripción automatizada, selección verificable y reportes listos para publicación.
            </p>
          </div>

          {/* Métodos y garantías */}
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold md:text-3xl">Cómo operamos cada sorteo</h2>
              <ul className="space-y-3 text-sm text-[color:var(--muted-foreground)] sm:text-base">
                <li>
                  <span className="font-semibold text-[color:var(--foreground)]">Planificación conjunta</span> · Definimos
                  reglas, fuentes de participantes y entregables con el patrocinador antes de lanzar la campaña.
                </li>
                <li>
                  <span className="font-semibold text-[color:var(--foreground)]">Ejecución monitorizada</span> · La
                  plataforma registra inscripciones, moderaciones y selección aleatoria con logs descargables.
                </li>
                <li>
                  <span className="font-semibold text-[color:var(--foreground)]">Cierre documentado</span> · Entregamos
                  actas, capturas y un resumen con métricas clave; también coordinamos la entrega del premio y su verificación.
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold md:text-3xl">Garantías operativas</h2>
              <div className="space-y-3">
                {TRUST_POINTS.map(({ Icon, title, description }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-4 py-3"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent)]" aria-hidden />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold md:text-3xl">Nuestra línea de tiempo</h2>
            <div className="space-y-6">
              {MILESTONES.map((milestone) => (
                <div key={milestone.year} className="relative border-l border-[color:var(--border)] pl-6">
                  <span
                    className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border border-[color:var(--border)] bg-[color:var(--accent)]"
                    aria-hidden
                  />
                  <div className="space-y-2 pb-6 last:pb-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                      {milestone.year} · {milestone.label}
                    </p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">{milestone.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold md:text-3xl">Nuestros valores</h2>
              <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">
                Los principios que guían cada decisión que tomamos.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(({ Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left"
                >
                  <Icon className="h-6 w-6 text-[color:var(--accent)]" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">{description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA final */}
          <div className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-8 text-center">
            <h2 className="text-2xl font-semibold md:text-3xl">Hablemos de tu próximo sorteo</h2>
            <p className="mx-auto max-w-2xl text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Te guiamos desde la idea hasta la entrega del premio. Coordina una reunión o revisa nuestros procesos antes de
              tomar una decisión.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] transition-colors hover:bg-[color:var(--accent)]/90"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/ayuda"
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-semibold transition-colors hover:border-[color:var(--accent)]/60"
              >
                Ver documentación operativa
              </Link>
            </div>
            <p className="text-xs text-[color:var(--muted-foreground)]">Te respondemos en menos de 24 horas hábiles.</p>
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
            sameAs: ['https://www.instagram.com/tusuerte_ec'],
            description:
              'Plataforma de sorteos digitales que prioriza transparencia, seguridad y experiencias memorables para la comunidad.',
            foundingDate: '2024',
          }),
        }}
      />

      <footer className="border-t border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-[color:var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TuSuerte. Todos los derechos reservados.</p>
          <div className="flex flex-wrap gap-4">
            <a
              className="transition-colors hover:text-[color:var(--accent)]"
              href="https://www.instagram.com/andres.cabrera20/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Desarrollado con ❤️ por <span className="font-semibold">William Cabrera</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
