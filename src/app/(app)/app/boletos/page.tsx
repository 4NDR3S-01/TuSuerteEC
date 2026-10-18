import Link from 'next/link';
import { ArrowRight, Clock, FileText, Receipt, Sparkles, Ticket, Trophy } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { requirePageUser } from '../../../../lib/auth/get-user';
import { PAYMENT_STATUS, RAFFLE_STATUS, formatDate, formatDateTime, formatPrice } from '../../../../lib/raffle/labels';
import { Badge, ButtonLink, Card, EmptyState, SectionHeader } from '../../../../components/ui/kit';
import { cn } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<{ vista?: string }> };

export default async function MyTicketsPage({ searchParams }: PageProps) {
  const user = await requirePageUser('/app/boletos');
  const view = (await searchParams)?.vista === 'pagos' ? 'pagos' : 'boletos';

  const [entries, payments] = await Promise.all([
    prisma.raffle_entries.findMany({
      where: { user_id: user.id },
      orderBy: [{ created_at: 'desc' }, { ticket_number: 'asc' }],
      select: {
        id: true,
        ticket_number: true,
        is_winner: true,
        entry_source: true,
        raffles: { select: { id: true, title: true, status: true, draw_date: true } },
      },
    }),
    prisma.payment_transactions.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        status: true,
        amount: true,
        discount_amount: true,
        currency: true,
        transaction_type: true,
        receipt_reference: true,
        rejection_reason: true,
        created_at: true,
        reviewed_at: true,
        metadata: true,
        raffles: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Agrupar boletos por sorteo
  const groups = new Map<string, { raffle: (typeof entries)[number]['raffles']; tickets: typeof entries }>();
  for (const entry of entries) {
    const group = groups.get(entry.raffles.id) ?? { raffle: entry.raffles, tickets: [] };
    group.tickets.push(entry);
    groups.set(entry.raffles.id, group);
  }
  const pendingCount = payments.filter((payment) => payment.status === 'pending').length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SectionHeader as="h1" title="Mis boletos y pagos" description="Tus números de boleto, el estado de cada pago y sus comprobantes." />

      <nav aria-label="Vista" className="flex gap-2">
        {[
          { href: '/app/boletos', label: `Boletos (${entries.length})`, active: view === 'boletos' },
          { href: '/app/boletos?vista=pagos', label: `Pagos${pendingCount ? ` · ${pendingCount} en revisión` : ''}`, active: view === 'pagos' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold',
              tab.active ? 'bg-[color:var(--foreground)] text-[color:var(--background)]' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === 'boletos' ? (
        groups.size === 0 ? (
          <EmptyState icon={Ticket} title="Todavía no tienes boletos" description="Cuando aprobemos tu primer pago, tus números aparecerán aquí." action={<ButtonLink href="/app/sorteos">Ver sorteos</ButtonLink>} />
        ) : (
          <div className="space-y-4">
            {Array.from(groups.values()).map(({ raffle, tickets }) => {
              const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
              const won = tickets.some((ticket) => ticket.is_winner);
              const finished = raffle.status === 'drawn' || raffle.status === 'completed';
              return (
                <Card key={raffle.id} className={cn('p-5', won && 'ring-2 ring-[color:var(--success)]')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {won && <Badge tone="success"><Trophy aria-hidden /> ¡Ganaste!</Badge>}
                      </div>
                      <h2 className="mt-2 text-lg font-bold">{raffle.title}</h2>
                      <p className="text-sm text-[color:var(--muted-foreground)]">Sorteo: {formatDateTime(raffle.draw_date)}</p>
                    </div>
                    <Link
                      href={finished ? `/resultados/${raffle.id}` : `/app/sorteos/${raffle.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)] hover:underline"
                    >
                      {finished ? 'Ver resultado' : 'Ver sorteo'} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Números de boleto">
                    {tickets.map((ticket) => (
                      <li key={ticket.id}>
                        <Badge
                          tone={ticket.is_winner ? 'success' : ticket.entry_source === 'subscription' ? 'info' : 'neutral'}
                          className="font-mono text-sm"
                          title={ticket.entry_source === 'subscription' ? 'Participación por suscripción' : 'Boleto comprado'}
                        >
                          #{ticket.ticket_number}
                          {ticket.entry_source === 'subscription' && <Sparkles aria-hidden />}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  {won && <p className="mt-3 text-sm text-[color:var(--success)]">Nuestro equipo te contactará para coordinar la entrega del premio.</p>}
                </Card>
              );
            })}
          </div>
        )
      ) : payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No has registrado pagos" description="Aquí verás cada pago, su estado y el comprobante de participación." />
      ) : (
        <Card className="divide-y divide-[color:var(--border)]">
          {payments.map((payment) => {
            const status = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending;
            const metadata = (payment.metadata ?? {}) as { tickets_requested?: number; plan_name?: string };
            const concept =
              payment.transaction_type === 'subscription'
                ? `Plan ${metadata.plan_name ?? ''}`
                : `${metadata.tickets_requested ?? 1} boleto(s) · ${payment.raffles?.title ?? 'Sorteo'}`;
            return (
              <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{concept}</p>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {formatDate(payment.created_at)} · Ref. {payment.receipt_reference} · {formatPrice(payment.amount, payment.currency)}
                    {payment.discount_amount > 0 && ` (descuento ${formatPrice(payment.discount_amount, payment.currency)})`}
                  </p>
                  {payment.rejection_reason && <p className="mt-1 text-sm text-[color:var(--danger)]">Motivo del rechazo: {payment.rejection_reason}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={status.tone}>{payment.status === 'pending' && <Clock aria-hidden />}{status.label}</Badge>
                  <Link href={`/app/pagos/${payment.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)] hover:underline">
                    <FileText className="size-4" aria-hidden /> Detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
