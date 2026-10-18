import Link from 'next/link';
import { ArrowRight, Clock, CreditCard, Gift, Sparkles, Ticket, Trophy, UserPlus } from 'lucide-react';
import { prisma } from '../../../lib/db';
import { requirePageUser } from '../../../lib/auth/get-user';
import { formatDate, formatDateTime } from '../../../lib/raffle/labels';
import { listPublicRaffles } from '../../../lib/queries/public';
import { RaffleCard } from '../../../components/raffles/raffle-card';
import { ButtonLink, Card, EmptyState, Notice, SectionHeader } from '../../../components/ui/kit';

export const dynamic = 'force-dynamic';

export default async function ParticipantHomePage() {
  const user = await requirePageUser('/app');
  const now = new Date();

  const [activeTickets, upcoming, pendingPayments, rejectedRecently, wins, subscription, openRaffles] = await Promise.all([
    prisma.raffle_entries.count({ where: { user_id: user.id, raffles: { status: { in: ['active', 'closed'] } } } }),
    prisma.raffles.findMany({
      where: { status: { in: ['active', 'closed'] }, raffle_entries: { some: { user_id: user.id } } },
      orderBy: { draw_date: 'asc' },
      take: 5,
      select: { id: true, title: true, draw_date: true, _count: { select: { raffle_entries: { where: { user_id: user.id } } } } },
    }),
    prisma.payment_transactions.count({ where: { user_id: user.id, status: 'pending' } }),
    prisma.payment_transactions.findFirst({
      where: { user_id: user.id, status: 'rejected', reviewed_at: { gt: new Date(now.getTime() - 7 * 86_400_000) } },
      orderBy: { reviewed_at: 'desc' },
      select: { id: true, rejection_reason: true },
    }),
    prisma.winners.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      select: { id: true, status: true, prize_position: true, raffles: { select: { id: true, title: true, prize_description: true } } },
    }),
    prisma.subscriptions.findFirst({
      where: { user_id: user.id, status: 'active', current_period_end: { gt: now } },
      orderBy: { current_period_end: 'desc' },
      select: { current_period_end: true, plans: { select: { name: true } } },
    }),
    listPublicRaffles({}, 3),
  ]);

  const pendingPrize = wins.find((win) => win.status !== 'prize_delivered');
  const firstName = user.fullName.split(' ')[0];

  const stats = [
    { label: 'Boletos en juego', value: String(activeTickets), icon: Ticket, href: '/app/boletos' },
    { label: 'Pagos en revisión', value: String(pendingPayments), icon: Clock, href: '/app/boletos?vista=pagos' },
    { label: 'Premios ganados', value: String(wins.length), icon: Trophy, href: '/app/boletos' },
    {
      label: subscription ? `Plan ${subscription.plans?.name ?? ''}` : 'Sin plan activo',
      value: subscription ? `Hasta ${formatDate(subscription.current_period_end)}` : 'Ver planes',
      icon: CreditCard,
      href: '/app/planes',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Hola, {firstName}</h1>
        <p className="text-[color:var(--muted-foreground)]">Este es el resumen de tu participación.</p>
      </div>

      {pendingPrize && (
        <Notice tone="success" icon={Trophy} title={`¡Ganaste en "${pendingPrize.raffles.title}"!`}>
          Premio: {pendingPrize.raffles.prize_description}. Nuestro equipo te contactará al teléfono y correo de tu cuenta; verifica que estén actualizados en{' '}
          <Link href="/app/settings" className="font-semibold underline">Configuración</Link>.
        </Notice>
      )}
      {rejectedRecently && (
        <Notice tone="danger" title="Uno de tus pagos no pudo verificarse">
          Motivo: {rejectedRecently.rejection_reason}. <Link href={`/app/pagos/${rejectedRecently.id}`} className="font-semibold underline">Ver detalle</Link>
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-[color:var(--accent)]">
              <stat.icon className="size-5 text-[color:var(--accent)]" aria-hidden />
              <dd className="mt-3 font-display text-2xl font-extrabold tabular-nums">{stat.value}</dd>
              <dt className="text-sm text-[color:var(--muted-foreground)]">{stat.label}</dt>
            </Card>
          </Link>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Tus próximos sorteos</h2>
          {upcoming.length === 0 ? (
            <EmptyState icon={Ticket} title="Todavía no participas en sorteos abiertos" description="Elige un sorteo y compra tus boletos en minutos." action={<ButtonLink href="/app/sorteos">Ver sorteos</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-[color:var(--border)]">
              {upcoming.map((raffle) => (
                <Link key={raffle.id} href={`/app/sorteos/${raffle.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-[color:var(--muted)]/50">
                  <span>
                    <span className="block font-semibold">{raffle.title}</span>
                    <span className="text-sm text-[color:var(--muted-foreground)]">Sorteo: {formatDateTime(raffle.draw_date)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[color:var(--accent)]">{raffle._count.raffle_entries} boleto(s)</span>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Accesos rápidos</h2>
          <Card className="divide-y divide-[color:var(--border)]">
            {[
              { href: '/app/sorteos', label: 'Explorar sorteos', icon: Gift },
              { href: '/app/planes', label: subscription ? 'Renovar mi plan' : 'Participar con un plan', icon: Sparkles },
              { href: '/app/referidos', label: 'Invitar amigos', icon: UserPlus },
              { href: '/resultados', label: 'Ver resultados', icon: Trophy },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between gap-3 p-4 text-sm font-semibold hover:bg-[color:var(--muted)]/50">
                <span className="flex items-center gap-3"><item.icon className="size-4 text-[color:var(--accent)]" aria-hidden /> {item.label}</span>
                <ArrowRight className="size-4 text-[color:var(--muted-foreground)]" aria-hidden />
              </Link>
            ))}
          </Card>
        </section>
      </div>

      {openRaffles.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Sorteos abiertos" action={<ButtonLink href="/app/sorteos" variant="secondary">Ver todos</ButtonLink>} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {openRaffles.map((raffle) => (
              <RaffleCard key={raffle.id} raffle={raffle} href={`/app/sorteos/${raffle.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
