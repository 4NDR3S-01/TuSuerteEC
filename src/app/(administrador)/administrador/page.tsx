import Link from 'next/link';
import { ArrowRight, CalendarClock, CreditCard, Gift, Plus, Receipt, Trophy, Users, Wallet } from 'lucide-react';
import { prisma } from '../../../lib/db';
import { requirePagePermission } from '../../../lib/auth/get-user';
import { getOpsAlerts } from '../../../lib/actions/ops';
import { PAYMENT_STATUS, RAFFLE_STATUS, formatDateTime, formatPrice } from '../../../lib/raffle/labels';
import { Badge, ButtonLink, Card, SectionHeader } from '../../../components/ui/kit';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  await requirePagePermission('admin_panel.access', '/administrador');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const approved = { status: { in: ['approved', 'completed'] } };

  const [revenueTotal, revenue30, totalUsers, newUsers, activeSubscriptions, activeRaffles, pendingPayments, recentPayments, nextDraws, alerts] = await Promise.all([
    prisma.payment_transactions.aggregate({ where: approved, _sum: { amount: true } }),
    prisma.payment_transactions.aggregate({ where: { ...approved, reviewed_at: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
    prisma.profiles.count({ where: { role: 'participant' } }),
    prisma.profiles.count({ where: { role: 'participant', created_at: { gte: thirtyDaysAgo } } }),
    prisma.subscriptions.count({ where: { status: 'active', current_period_end: { gt: now } } }),
    prisma.raffles.count({ where: { status: 'active' } }),
    prisma.payment_transactions.count({ where: { status: 'pending' } }),
    prisma.payment_transactions.findMany({
      orderBy: { created_at: 'desc' },
      take: 6,
      select: { id: true, amount: true, status: true, created_at: true, transaction_type: true, profiles: { select: { full_name: true } }, raffles: { select: { title: true } } },
    }),
    prisma.raffles.findMany({
      where: { status: { in: ['active', 'closed'] } },
      orderBy: { draw_date: 'asc' },
      take: 5,
      select: { id: true, title: true, status: true, draw_date: true, _count: { select: { raffle_entries: true } } },
    }),
    getOpsAlerts('/administrador'),
  ]);

  const metrics = [
    { label: 'Ingresos verificados (30 días)', value: formatPrice(revenue30._sum.amount ?? 0), hint: `Total histórico ${formatPrice(revenueTotal._sum.amount ?? 0)}`, icon: Wallet },
    { label: 'Pagos por revisar', value: String(pendingPayments), hint: 'Comprobantes en espera', icon: Receipt, href: '/administrador/pagos/transacciones' },
    { label: 'Participantes', value: String(totalUsers), hint: `${newUsers} nuevos en 30 días`, icon: Users, href: '/administrador/usuarios' },
    { label: 'Planes activos', value: String(activeSubscriptions), hint: `${activeRaffles} sorteo(s) abiertos`, icon: CreditCard },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        title="Resumen"
        description="Cifras reales de la plataforma y tareas pendientes."
        action={<ButtonLink href="/administrador/sorteos?crear=true"><Plus aria-hidden /> Nuevo sorteo</ButtonLink>}
      />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const content = (
            <Card className="h-full p-5">
              <metric.icon className="size-5 text-[color:var(--accent)]" aria-hidden />
              <dd className="mt-3 font-display text-2xl font-extrabold tabular-nums">{metric.value}</dd>
              <dt className="text-sm font-medium">{metric.label}</dt>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{metric.hint}</p>
            </Card>
          );
          return metric.href ? <Link key={metric.label} href={metric.href} className="block hover:opacity-90">{content}</Link> : <div key={metric.label}>{content}</div>;
        })}
      </dl>

      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Tareas pendientes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <Link key={alert.id} href={alert.href} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 hover:border-[color:var(--accent)]">
                <span>
                  <span className="block font-semibold">{alert.title}</span>
                  <span className="text-sm text-[color:var(--muted-foreground)]">{alert.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-[color:var(--muted-foreground)]" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Próximos sorteos</h2>
            <Link href="/administrador/sorteos" className="text-sm font-semibold text-[color:var(--accent)]">Ver todos</Link>
          </div>
          <Card className="divide-y divide-[color:var(--border)]">
            {nextDraws.length === 0 && <p className="p-4 text-sm text-[color:var(--muted-foreground)]">No hay sorteos abiertos ni cerrados.</p>}
            {nextDraws.map((raffle) => {
              const status = RAFFLE_STATUS[raffle.status];
              return (
                <div key={raffle.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate font-semibold"><Gift className="size-4 text-[color:var(--accent)]" aria-hidden /> {raffle.title}</span>
                    <span className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]"><CalendarClock className="size-3.5" aria-hidden /> {formatDateTime(raffle.draw_date)} · {raffle._count.raffle_entries} boletos</span>
                  </span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              );
            })}
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Pagos recientes</h2>
            <Link href="/administrador/pagos/transacciones" className="text-sm font-semibold text-[color:var(--accent)]">Revisar</Link>
          </div>
          <Card className="divide-y divide-[color:var(--border)]">
            {recentPayments.length === 0 && <p className="p-4 text-sm text-[color:var(--muted-foreground)]">Aún no hay pagos.</p>}
            {recentPayments.map((payment) => {
              const status = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending;
              return (
                <div key={payment.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{payment.profiles?.full_name}</span>
                    <span className="block truncate text-xs text-[color:var(--muted-foreground)]">
                      {payment.transaction_type === 'subscription' ? 'Plan' : payment.raffles?.title} · {formatDateTime(payment.created_at)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">{formatPrice(payment.amount)}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      </div>

      <p className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
        <Trophy className="size-4" aria-hidden /> Los ingresos solo incluyen pagos verificados por el equipo.
      </p>
    </div>
  );
}
