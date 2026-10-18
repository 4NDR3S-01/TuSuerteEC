import Link from 'next/link';
import { requirePagePermission } from '../../../../lib/auth/get-user';
import { prisma } from '../../../../lib/db';
import { ENTRY_MODES, RAFFLE_STATUS, formatDateTime, formatPrice } from '../../../../lib/raffle/labels';
import { Badge, Card, SectionHeader } from '../../../../components/ui/kit';

export const dynamic = 'force-dynamic';

/** Consulta de sorteos para el staff (sin acciones de modificación) */
export default async function StaffRafflesPage() {
  await requirePagePermission('raffles.view_all', '/staff/sorteos');
  const raffles = await prisma.raffles.findMany({
    where: { status: { not: 'draft' } },
    orderBy: [{ status: 'asc' }, { draw_date: 'asc' }],
    take: 200,
    select: {
      id: true, title: true, status: true, entry_mode: true, ticket_price: true, end_date: true, draw_date: true, total_winners: true,
      _count: { select: { raffle_entries: true, payment_transactions: { where: { status: 'pending' } } } },
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader as="h1" title="Sorteos" description="Consulta de sorteos publicados. La configuración y la ejecución las realiza un administrador." />
      <div className="space-y-3 md:hidden">
        {raffles.map((raffle) => {
          const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
          return (
            <Card key={raffle.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/sorteos/${raffle.id}`} className="font-semibold hover:text-[color:var(--accent)]">{raffle.title}</Link>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {ENTRY_MODES[raffle.entry_mode]?.label} · {raffle.ticket_price ? `${formatPrice(raffle.ticket_price)} por boleto` : 'sin venta de boletos'}
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">Cierra {formatDateTime(raffle.end_date)} · Sorteo {formatDateTime(raffle.draw_date)}</p>
              <p className="text-sm">
                {raffle._count.raffle_entries} boletos ·{' '}
                {raffle._count.payment_transactions > 0 ? <Link href="/staff/pagos" className="font-semibold text-[color:var(--accent)]">{raffle._count.payment_transactions} pago(s) pendiente(s)</Link> : 'sin pagos pendientes'}
              </p>
            </Card>
          );
        })}
      </div>
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[color:var(--muted)]/60 text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <tr>
              <th scope="col" className="px-4 py-3">Sorteo</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Modalidad</th>
              <th scope="col" className="px-4 py-3">Cierre</th>
              <th scope="col" className="px-4 py-3">Sorteo</th>
              <th scope="col" className="px-4 py-3 text-right">Boletos</th>
              <th scope="col" className="px-4 py-3 text-right">Pagos pendientes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {raffles.map((raffle) => {
              const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
              return (
                <tr key={raffle.id}>
                  <td className="px-4 py-3">
                    <Link href={`/sorteos/${raffle.id}`} className="font-semibold hover:text-[color:var(--accent)]">{raffle.title}</Link>
                    <p className="text-xs text-[color:var(--muted-foreground)]">{raffle.ticket_price ? `${formatPrice(raffle.ticket_price)} por boleto` : 'Sin venta de boletos'} · {raffle.total_winners} ganador(es)</p>
                  </td>
                  <td className="px-4 py-3"><Badge tone={status.tone}>{status.label}</Badge></td>
                  <td className="px-4 py-3">{ENTRY_MODES[raffle.entry_mode]?.label}</td>
                  <td className="px-4 py-3">{formatDateTime(raffle.end_date)}</td>
                  <td className="px-4 py-3">{formatDateTime(raffle.draw_date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{raffle._count.raffle_entries}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {raffle._count.payment_transactions > 0 ? <Link href="/staff/pagos" className="font-semibold text-[color:var(--accent)]">{raffle._count.payment_transactions}</Link> : 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
