import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, Clock, Info, Sparkles, Trophy } from 'lucide-react';
import { prisma } from '../../../../../lib/db';
import { requirePageUser } from '../../../../../lib/auth/get-user';
import { fetchActivePaymentMethods } from '../../../../../lib/payments/server';
import { getPublicRaffle } from '../../../../../lib/queries/public';
import { ENTRY_MODES, PAYMENT_STATUS, RAFFLE_STATUS, formatDateTime, formatPrice, prizeCategory } from '../../../../../lib/raffle/labels';
import { RaffleFacts } from '../../../../../components/raffles/raffle-facts';
import { RafflePurchasePanel } from '../../../../../components/raffles/raffle-purchase-panel';
import { FavoriteButton } from '../../../../../components/raffles/favorite-button';
import { ShareButtons } from '../../../../../components/raffles/share-buttons';
import { Badge, ButtonLink, Card, Notice } from '../../../../../components/ui/kit';
import { SITE } from '../../../../../config/site';

export const dynamic = 'force-dynamic';

export default async function ParticipantRafflePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/app/sorteos/${id}`);
  const raffle = await getPublicRaffle(id);
  if (!raffle) notFound();

  const [entries, pending, favorite, subscription, paymentMethods, referral] = await Promise.all([
    prisma.raffle_entries.findMany({
      where: { raffle_id: raffle.id, user_id: user.id },
      orderBy: { ticket_number: 'asc' },
      select: { id: true, ticket_number: true, entry_source: true, is_winner: true },
    }),
    prisma.payment_transactions.findMany({
      where: { raffle_id: raffle.id, user_id: user.id, status: { in: ['pending', 'rejected'] } },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { id: true, status: true, amount: true, created_at: true, rejection_reason: true, metadata: true },
    }),
    prisma.raffle_favorites.findUnique({ where: { user_id_raffle_id: { user_id: user.id, raffle_id: raffle.id } } }),
    prisma.subscriptions.findFirst({
      where: { user_id: user.id, status: 'active', current_period_end: { gt: new Date() } },
      select: { id: true },
    }),
    fetchActivePaymentMethods('raffles'),
    prisma.profiles.findUnique({ where: { id: user.id }, select: { referral_code: true } }),
  ]);

  const pendingTickets = pending
    .filter((payment) => payment.status === 'pending')
    .reduce((sum, payment) => sum + (Number((payment.metadata as { tickets_requested?: number } | null)?.tickets_requested) || 1), 0);
  const remainingAllowance = raffle.max_entries_per_user ? Math.max(0, raffle.max_entries_per_user - entries.length - pendingTickets) : null;

  const category = prizeCategory(raffle.prize_category);
  const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
  const now = new Date();
  const isOpen = raffle.status === 'active' && (!raffle.end_date || new Date(raffle.end_date) > now) && (!raffle.start_date || new Date(raffle.start_date) <= now);
  const sellsTickets = raffle.entry_mode !== 'subscribers_only';
  const shareUrl = `${SITE.url}/sorteos/${raffle.id}${referral?.referral_code ? `?ref=${referral.referral_code}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link href="/app/sorteos" className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
        <ArrowLeft className="size-4" aria-hidden /> Sorteos
      </Link>

      {/* En móvil el orden es: premio → compra → detalles; en escritorio la compra queda fija a la derecha */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="space-y-6 lg:col-start-1 lg:row-start-1">
          <Card className="overflow-hidden">
            {raffle.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={raffle.image_url} alt={`Premio: ${raffle.prize_description}`} className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center" style={{ background: 'var(--hero-gradient)' }}>
                <category.icon className="size-20 text-white/80" strokeWidth={1.25} aria-hidden />
              </div>
            )}
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={status.tone}>{status.label}</Badge>
                <Badge><category.icon aria-hidden /> {category.label}</Badge>
              </div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">{raffle.title}</h1>
              <p className="flex items-start gap-2 text-[color:var(--muted-foreground)]">
                <Trophy className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden /> {raffle.prize_description}
              </p>
              {raffle.description && <p className="whitespace-pre-line text-sm text-[color:var(--muted-foreground)]">{raffle.description}</p>}
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{isOpen && sellsTickets ? 'Comprar boletos' : 'Participación'}</h2>
              {isOpen && <FavoriteButton raffleId={raffle.id} initialFavorite={Boolean(favorite)} isAuthenticated />}
            </div>

            {isOpen ? (
              <>
                {raffle.entry_mode !== 'tickets_only' && (
                  <Notice tone={subscription ? 'success' : 'info'} icon={Sparkles}>
                    {subscription
                      ? 'Tu plan activo te da una participación automática en este sorteo (si no superas el límite de sorteos simultáneos de tu plan).'
                      : 'Con un plan activo participarías automáticamente en este sorteo.'}
                    {!subscription && (
                      <> <Link href="/app/planes" className="font-semibold underline">Ver planes</Link></>
                    )}
                  </Notice>
                )}
                {sellsTickets ? (
                  <RafflePurchasePanel
                    raffleId={raffle.id}
                    raffleTitle={raffle.title}
                    ticketPrice={raffle.ticket_price ?? 0}
                    remainingAllowance={remainingAllowance}
                    paymentMethods={paymentMethods}
                  />
                ) : (
                  !subscription && <ButtonLink href="/app/planes" block>Elegir un plan</ButtonLink>
                )}
              </>
            ) : raffle.status === 'drawn' || raffle.status === 'completed' ? (
              <>
                <Notice tone="info" icon={Trophy}>El sorteo ya se realizó.</Notice>
                <ButtonLink href={`/resultados/${raffle.id}`} block>Ver resultados y verificar</ButtonLink>
              </>
            ) : (
              <Notice tone="warning" icon={raffle.status === 'active' ? CalendarClock : Info}>
                {raffle.status === 'active' && raffle.start_date && new Date(raffle.start_date) > now
                  ? `La participación abre el ${formatDateTime(raffle.start_date)}.`
                  : `La participación está cerrada. El sorteo será el ${formatDateTime(raffle.draw_date)}.`}
              </Notice>
            )}
          </Card>

          <Card className="space-y-3 p-6">
            <p className="text-sm font-semibold">Invita a tus amigos</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">El enlace incluye tu código: si alguien se registra con él y completa su primer pago, recibes un descuento.</p>
            <ShareButtons url={shareUrl} title={raffle.title} />
          </Card>
        
        </aside>

        <div className="space-y-6 lg:col-start-1 lg:row-start-2">
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Mis participaciones</h2>
            {entries.length === 0 && pending.length === 0 ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">Aún no participas en este sorteo.</p>
            ) : (
              <Card className="space-y-4 p-5">
                {entries.length > 0 && (
                  <div>
                    <p className="text-sm text-[color:var(--muted-foreground)]">{entries.length} boleto(s) activo(s)</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {entries.map((entry) => (
                        <li key={entry.id}>
                          <Badge tone={entry.is_winner ? 'success' : entry.entry_source === 'subscription' ? 'info' : 'accent'} className="font-mono text-sm">
                            #{entry.ticket_number}
                            {entry.entry_source === 'subscription' && <Sparkles aria-label="Por suscripción" />}
                            {entry.is_winner && <Trophy aria-label="Ganador" />}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pending.map((payment) => {
                  const paymentStatus = PAYMENT_STATUS[payment.status];
                  const ticketsRequested = Number((payment.metadata as { tickets_requested?: number } | null)?.tickets_requested) || 1;
                  return (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[color:var(--muted)]/60 p-3 text-sm">
                      <span>
                        {ticketsRequested} boleto(s) · {formatPrice(payment.amount)} · {formatDateTime(payment.created_at)}
                        {payment.rejection_reason && <span className="block text-xs text-[color:var(--danger)]">Motivo: {payment.rejection_reason}</span>}
                      </span>
                      <Badge tone={paymentStatus.tone}>{payment.status === 'pending' ? <Clock aria-hidden /> : null}{paymentStatus.label}</Badge>
                    </div>
                  );
                })}
              </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Condiciones</h2>
            <RaffleFacts raffle={raffle} />
            <p className="text-sm text-[color:var(--muted-foreground)]">{ENTRY_MODES[raffle.entry_mode]?.description}</p>
            {raffle.terms && <Card className="whitespace-pre-line p-5 text-sm text-[color:var(--muted-foreground)]">{raffle.terms}</Card>}
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Consulta las <Link href="/bases" className="font-semibold text-[color:var(--accent)] hover:underline">bases generales</Link> y{' '}
              <Link href={`/resultados/${raffle.id}`} className="font-semibold text-[color:var(--accent)] hover:underline">cómo verificar el resultado</Link>.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
