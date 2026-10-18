import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Fingerprint,
  Gift,
  Lock,
  ReceiptText,
  ShieldCheck,
  Ticket,
  Trophy,
  UserPlus,
} from "lucide-react";

import { FaqAccordion } from "../../components/home/faq-accordion";
import { PlansGrid } from "../../components/home/plans-grid";
import { RaffleCard } from "../../components/raffles/raffle-card";
import { Badge, ButtonLink, Card, EmptyState, SectionHeader } from "../../components/ui/kit";
import { FAQS } from "../../config/help";
import { SITE } from "../../config/site";
import { prisma, toPlain } from "../../lib/db";
import { abbreviateName, formatDate } from "../../lib/raffle/labels";
import { getPublicStats, listPublicRaffles } from "../../lib/queries/public";

const STEPS = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta gratis",
    text: "Con tu cédula: una cuenta por persona, para que el premio llegue a quien corresponde.",
  },
  {
    icon: Ticket,
    title: "Elige y paga tus boletos",
    text: "Transferencia o código QR. Ves el total exacto antes de pagar y subes tu comprobante.",
  },
  {
    icon: BadgeCheck,
    title: "Verificamos tu pago",
    text: "Una persona del equipo revisa el comprobante. Al aprobarlo, recibes tus boletos con número único.",
  },
  {
    icon: Trophy,
    title: "Sorteo verificable",
    text: "El ganador se calcula con un algoritmo publicado. Cualquiera puede comprobar el resultado.",
  },
] as const;

const TRUST_POINTS = [
  {
    icon: Fingerprint,
    title: "Compromiso antes del sorteo",
    text: "Al cerrar publicamos la huella de una semilla secreta y de la lista de boletos. Después ya no se pueden cambiar.",
  },
  {
    icon: Eye,
    title: "Resultado comprobable",
    text: "Al sortear revelamos la semilla. Tu navegador puede repetir el cálculo y confirmar a los ganadores.",
  },
  {
    icon: ReceiptText,
    title: "Cada pago, revisado y registrado",
    text: "Los pagos se aprueban uno por uno y cada acción del equipo queda en un registro de auditoría.",
  },
  {
    icon: Lock,
    title: "Tus datos protegidos",
    text: "Tus comprobantes solo los ve el equipo que revisa pagos. En público solo mostramos tu nombre abreviado.",
  },
] as const;

export default async function HomePage() {
  const [raffles, stats, plans, recentResults] = await Promise.all([
    listPublicRaffles({}, 6),
    getPublicStats(),
    prisma.plans.findMany({ where: { is_active: true }, orderBy: { price: "asc" } }),
    prisma.raffles.findMany({
      where: { status: { in: ["drawn", "completed"] } },
      orderBy: { drawn_at: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        prize_description: true,
        drawn_at: true,
        winners: {
          orderBy: { prize_position: "asc" },
          take: 3,
          select: {
            id: true,
            status: true,
            raffle_entries: { select: { ticket_number: true } },
            profiles: { select: { full_name: true } },
          },
        },
      },
    }),
  ]);

  const featured = raffles[0];
  const statItems = [
    { label: "Sorteos abiertos", value: stats.openRaffles },
    { label: "Sorteos realizados", value: stats.drawnRaffles },
    { label: "Premios entregados", value: stats.deliveredPrizes },
  ].filter((item) => item.value > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[color:var(--hero-border)] text-[color:var(--hero-fg)]" style={{ background: "var(--hero-surface)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-[color:var(--hero-glow)] blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="animate-fade-up space-y-7">
            <Badge tone="hero">
              <ShieldCheck aria-hidden /> Sorteos en línea en Ecuador
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
              Participa por premios reales con <span className="text-[color:var(--hero-accent)]">reglas claras</span> y resultados que puedes comprobar.
            </h1>
            <p className="max-w-xl text-base text-[color:var(--hero-muted)] sm:text-lg">
              Compras tus boletos con transferencia o QR, verificamos tu pago y el ganador se elige con un procedimiento público y verificable.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/sorteos" size="lg">
                Ver sorteos abiertos <ArrowRight aria-hidden />
              </ButtonLink>
              <ButtonLink href="#como-funciona" variant="hero" size="lg">
                Cómo funciona
              </ButtonLink>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-[color:var(--hero-muted)] sm:flex-row sm:flex-wrap sm:gap-x-6">
              <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-[color:var(--hero-icon)]" aria-hidden /> Pagos verificados por personas</li>
              <li className="flex items-center gap-2"><Fingerprint className="size-4 text-[color:var(--hero-icon)]" aria-hidden /> Algoritmo publicado</li>
              <li className="flex items-center gap-2"><Lock className="size-4 text-[color:var(--hero-icon)]" aria-hidden /> Solo mayores de 18 años</li>
            </ul>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            {featured ? (
              <div className="rounded-3xl bg-[color:var(--hero-panel)] p-3 ring-1 ring-[color:var(--hero-border)] backdrop-blur">
                <RaffleCard raffle={featured} href={`/sorteos/${featured.id}`} />
              </div>
            ) : (
              <div className="rounded-3xl border border-[color:var(--hero-border)] bg-[color:var(--hero-panel)] p-8 text-center">
                <Gift className="mx-auto size-12 text-[color:var(--hero-icon)]" aria-hidden />
                <p className="mt-4 text-lg font-semibold">Pronto publicaremos nuevos sorteos</p>
                <p className="mt-2 text-sm text-[color:var(--hero-muted)]">Crea tu cuenta para recibir el aviso en cuanto abran.</p>
                <ButtonLink href="/registro" className="mt-6">Crear cuenta gratis</ButtonLink>
              </div>
            )}
          </div>
        </div>
      </section>

      {statItems.length > 0 && (
        <section aria-label="Cifras de la plataforma" className="border-b border-[color:var(--border)] bg-[color:var(--card)]">
          <dl
            className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-[color:var(--border)] px-4 sm:grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))] sm:divide-x sm:divide-y-0 sm:px-6"
            style={{ ["--stat-cols" as string]: statItems.length }}
          >
            {statItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 py-6">
                <dt className="text-sm text-[color:var(--muted-foreground)]">{item.label}</dt>
                <dd className="font-display text-3xl font-extrabold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mx-auto w-full max-w-6xl space-y-24 px-4 py-20 sm:px-6">
        {/* Sorteos abiertos */}
        <section id="sorteos" className="scroll-mt-header space-y-8">
          <SectionHeader
            eyebrow="Sorteos abiertos"
            title="Elige tu próximo premio"
            description="Cada sorteo muestra su precio, fechas, cantidad de ganadores y boletos emitidos hasta ahora."
            action={
              raffles.length > 0 ? (
                <ButtonLink href="/sorteos" variant="secondary">
                  Ver todos <ArrowRight aria-hidden />
                </ButtonLink>
              ) : null
            }
          />
          {raffles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {raffles.map((raffle) => (
                <RaffleCard key={raffle.id} raffle={raffle} href={`/sorteos/${raffle.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Gift} title="No hay sorteos abiertos en este momento" description="Crea tu cuenta y te avisaremos cuando publiquemos el próximo." action={<ButtonLink href="/registro">Crear cuenta</ButtonLink>} />
          )}
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-header space-y-10">
          <SectionHeader align="center" eyebrow="Cómo funciona" title="Cuatro pasos, sin letra pequeña" description="Así es el recorrido desde que creas tu cuenta hasta la entrega del premio." />
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-display text-3xl font-extrabold text-[color:var(--border-strong)]">{index + 1}</span>
                  </div>
                  <h3 className="mt-5 font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{step.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Transparencia */}
        <section id="transparencia" className="scroll-mt-header overflow-hidden rounded-3xl border border-[color:var(--hero-border)] text-[color:var(--hero-fg)]" style={{ background: "var(--hero-surface)" }}>
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--hero-accent)]">Transparencia</p>
              <h2 className="text-3xl font-bold">No te pedimos que confíes: te damos cómo comprobarlo.</h2>
              <p className="text-[color:var(--hero-muted)]">
                Cada sorteo deja datos públicos que permiten verificar que el resultado no se eligió a conveniencia. Puedes revisarlos en la página de resultados de cada sorteo.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/resultados" variant="primary">Ver resultados</ButtonLink>
                <ButtonLink href="/bases" variant="hero">Leer las bases</ButtonLink>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="rounded-2xl border border-[color:var(--hero-border)] bg-[color:var(--hero-panel)] p-5">
                  <point.icon className="size-6 text-[color:var(--hero-icon)]" aria-hidden />
                  <p className="mt-3 font-semibold">{point.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--hero-muted)]">{point.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Planes */}
        {plans.length > 0 && (
          <section id="planes" className="scroll-mt-header space-y-8">
            <SectionHeader
              align="center"
              eyebrow="Planes"
              title="Participa automáticamente cada período"
              description="Con un plan activo entras a los sorteos para suscriptores sin comprar boletos. Sin cobros automáticos."
            />
            <PlansGrid plans={toPlain(plans)} />
          </section>
        )}

        {/* Resultados recientes */}
        <section id="ganadores" className="scroll-mt-header space-y-8">
          <SectionHeader
            eyebrow="Resultados"
            title="Últimos sorteos realizados"
            description="Ganadores con nombre abreviado y número de boleto. Entra a cada sorteo para verificar el procedimiento."
            action={recentResults.length > 0 ? <ButtonLink href="/resultados" variant="secondary">Ver historial <ArrowRight aria-hidden /></ButtonLink> : null}
          />
          {recentResults.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {recentResults.map((raffle) => (
                <Card key={raffle.id} className="flex flex-col p-6">
                  <p className="text-xs text-[color:var(--muted-foreground)]">Sorteado el {formatDate(raffle.drawn_at)}</p>
                  <h3 className="mt-1 font-bold">{raffle.title}</h3>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {raffle.winners.map((winner, index) => (
                      <li key={winner.id} className="flex items-center justify-between gap-2 rounded-xl bg-[color:var(--muted)] px-3 py-2">
                        <span className="flex items-center gap-2 font-medium">
                          <Trophy className="size-4 text-[color:var(--accent)]" aria-hidden />
                          {index + 1}° {abbreviateName(winner.profiles?.full_name)}
                        </span>
                        <span className="font-mono text-xs text-[color:var(--muted-foreground)]">#{winner.raffle_entries?.ticket_number}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/resultados/${raffle.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)] hover:underline">
                    Verificar resultado <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Trophy} title="Todavía no hay sorteos realizados" description="Cuando realicemos el primero, aquí verás a los ganadores y cómo verificar el resultado." />
          )}
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" className="scroll-mt-header grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
          {/* Título arriba a la izquierda (fijo al desplazarse), alineado con la primera pregunta */}
          <div className="space-y-4 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Preguntas frecuentes</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Lo que más nos preguntan</h2>
            <p className="text-sm text-[color:var(--muted-foreground)] sm:text-base">
              Respuestas rápidas sobre pagos, boletos y cómo se elige al ganador. ¿Tienes otra duda? Visita el centro de ayuda.
            </p>
            <ButtonLink href="/ayuda" variant="secondary">Centro de ayuda</ButtonLink>
          </div>
          <FaqAccordion items={FAQS.slice(0, 5)} />
        </section>

        {/* Llamado final */}
        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Crea tu cuenta y participa en el próximo sorteo</h2>
          <p className="mx-auto mt-3 max-w-xl text-[color:var(--muted-foreground)]">
            Registrarte es gratis. Solo pagas cuando decides participar, y siempre ves el total antes de pagar.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/registro" size="lg">Crear cuenta gratis</ButtonLink>
            <ButtonLink href="/sorteos" variant="secondary" size="lg">Ver sorteos</ButtonLink>
          </div>
          <p className="mt-6 text-xs text-[color:var(--muted-foreground)]">
            {SITE.name} · Participación solo para mayores de 18 años. Consulta las <Link href="/bases" className="underline">bases</Link> y la{" "}
            <Link href="/privacidad" className="underline">política de privacidad</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
