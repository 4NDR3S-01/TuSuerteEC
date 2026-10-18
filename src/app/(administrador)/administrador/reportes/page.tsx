import Link from 'next/link';
import { requirePagePermission } from '../../../../lib/auth/get-user';
import { prisma } from '../../../../lib/db';
import { formatPrice } from '../../../../lib/raffle/labels';
import { Card, SectionHeader } from '../../../../components/ui/kit';

export const dynamic = 'force-dynamic';

type MonthRow = { month: Date; revenue: number | null; approved: bigint; tickets: bigint; signups: bigint };

export default async function AdminReportsPage() {
  await requirePagePermission('reports.view', '/administrador/reportes');

  // Agregaciones en la base de datos (no se cargan filas individuales)
  const [months, funnel, topRaffles, discounts, referrals] = await Promise.all([
    prisma.$queryRaw<MonthRow[]>`
      WITH months AS (
        SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS month
      )
      SELECT m.month,
        (SELECT SUM(amount) FROM payment_transactions p WHERE p.status IN ('approved','completed') AND date_trunc('month', p.reviewed_at) = m.month) AS revenue,
        (SELECT COUNT(*) FROM payment_transactions p WHERE p.status IN ('approved','completed') AND date_trunc('month', p.reviewed_at) = m.month) AS approved,
        (SELECT COUNT(*) FROM raffle_entries e WHERE date_trunc('month', e.created_at) = m.month) AS tickets,
        (SELECT COUNT(*) FROM profiles pr WHERE pr.role = 'participant' AND date_trunc('month', pr.created_at) = m.month) AS signups
      FROM months m ORDER BY m.month`,
    prisma.payment_transactions.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
    prisma.raffles.findMany({
      where: { status: { not: 'draft' } },
      orderBy: { raffle_entries: { _count: 'desc' } },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { raffle_entries: true } },
        payment_transactions: { where: { status: { in: ['approved', 'completed'] } }, select: { amount: true } },
      },
    }),
    prisma.discount_redemptions.aggregate({ where: { status: 'confirmed' }, _count: true, _sum: { amount: true } }),
    Promise.all([prisma.profiles.count({ where: { referred_by: { not: null } } }), prisma.referral_rewards.count()]),
  ]);

  const byStatus = Object.fromEntries(funnel.map((row) => [row.status, row]));
  const reviewed = (byStatus.approved?._count ?? 0) + (byStatus.completed?._count ?? 0) + (byStatus.rejected?._count ?? 0);
  const approvalRate = reviewed ? Math.round((((byStatus.approved?._count ?? 0) + (byStatus.completed?._count ?? 0)) / reviewed) * 100) : null;
  const maxRevenue = Math.max(1, ...months.map((row) => Number(row.revenue ?? 0)));

  return (
    <div className="space-y-8">
      <SectionHeader as="h1" title="Reportes" description="Datos agregados de los últimos seis meses. Los ingresos solo incluyen pagos verificados." />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Pagos en revisión', String(byStatus.pending?._count ?? 0)],
          ['Tasa de aprobación', approvalRate === null ? '—' : `${approvalRate}%`],
          ['Descuentos otorgados', `${formatPrice(discounts._sum.amount ?? 0)} (${discounts._count})`],
          ['Referidos con recompensa', `${referrals[1]} de ${referrals[0]}`],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
            <dt className="text-sm text-[color:var(--muted-foreground)]">{label}</dt>
          </Card>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Evolución mensual</h2>
        <Card className="overflow-x-auto p-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th scope="col" className="pb-3">Mes</th>
                <th scope="col" className="pb-3">Ingresos verificados</th>
                <th scope="col" className="pb-3 text-right">Pagos aprobados</th>
                <th scope="col" className="pb-3 text-right">Boletos emitidos</th>
                <th scope="col" className="pb-3 text-right">Registros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {months.map((row) => {
                const revenue = Number(row.revenue ?? 0);
                return (
                  <tr key={row.month.toISOString()}>
                    <td className="py-3 font-medium capitalize">{row.month.toLocaleDateString('es-EC', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-40 overflow-hidden rounded-full bg-[color:var(--muted)]" aria-hidden>
                          <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(revenue / maxRevenue) * 100}%` }} />
                        </div>
                        <span className="tabular-nums">{formatPrice(revenue)}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right tabular-nums">{Number(row.approved)}</td>
                    <td className="py-3 text-right tabular-nums">{Number(row.tickets)}</td>
                    <td className="py-3 text-right tabular-nums">{Number(row.signups)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Sorteos con más participación</h2>
        <Card className="divide-y divide-[color:var(--border)]">
          {topRaffles.length === 0 && <p className="p-4 text-sm text-[color:var(--muted-foreground)]">Aún no hay sorteos publicados.</p>}
          {topRaffles.map((raffle) => (
            <div key={raffle.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <Link href={`/sorteos/${raffle.id}`} className="truncate font-semibold hover:text-[color:var(--accent)]">{raffle.title}</Link>
              <span className="shrink-0 text-[color:var(--muted-foreground)]">
                {raffle._count.raffle_entries} boletos · {formatPrice(raffle.payment_transactions.reduce((sum, payment) => sum + payment.amount, 0))}
              </span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
