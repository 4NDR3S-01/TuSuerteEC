import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { prisma } from '../../../../../lib/db';
import { requirePageUser } from '../../../../../lib/auth/get-user';
import { PAYMENT_STATUS, formatDateTime, formatPrice } from '../../../../../lib/raffle/labels';
import { PrintButton } from '../../../../../components/payments/print-button';
import { Badge, Card, Notice } from '../../../../../components/ui/kit';
import { SITE } from '../../../../../config/site';

export const dynamic = 'force-dynamic';

/** Comprobante de participación: solo lo ve el dueño del pago */
export default async function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/app/pagos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const payment = await prisma.payment_transactions.findFirst({
    where: { id, user_id: user.id },
    include: {
      raffles: { select: { id: true, title: true, draw_date: true } },
      raffle_entries: { select: { ticket_number: true }, orderBy: { ticket_number: 'asc' } },
      payment_methods: { select: { name: true } },
      subscriptions: { select: { current_period_start: true, current_period_end: true, plans: { select: { name: true } } } },
    },
  });
  if (!payment) notFound();

  const status = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending;
  const metadata = (payment.metadata ?? {}) as { tickets_requested?: number; plan_name?: string; discount_code?: string | null };
  const rows: Array<[string, string]> = [
    ['Código del pago', payment.id],
    ['Titular', user.fullName],
    ['Cédula', user.idNumber],
    ['Fecha de solicitud', formatDateTime(payment.created_at)],
    ['Método', payment.payment_methods.name],
    ['Referencia del comprobante', payment.receipt_reference ?? '—'],
  ];
  if (payment.subtotal && payment.discount_amount > 0) {
    rows.push(['Subtotal', formatPrice(payment.subtotal, payment.currency)]);
    rows.push([`Descuento${metadata.discount_code ? ` (${metadata.discount_code})` : ''}`, `−${formatPrice(payment.discount_amount, payment.currency)}`]);
  }
  rows.push(['Total pagado', formatPrice(payment.amount, payment.currency)]);
  if (payment.reviewed_at) rows.push(['Fecha de verificación', formatDateTime(payment.reviewed_at)]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/app/boletos?vista=pagos" className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
          <ArrowLeft className="size-4" aria-hidden /> Mis pagos
        </Link>
        {payment.status === 'approved' && <PrintButton />}
      </div>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted-foreground)]">{SITE.legalName ?? SITE.name}</p>
            <h1 className="mt-1 text-2xl font-extrabold">
              {payment.status === 'approved' ? 'Comprobante de participación' : 'Detalle del pago'}
            </h1>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {payment.transaction_type === 'subscription' ? `Plan ${metadata.plan_name ?? payment.subscriptions?.plans?.name ?? ''}` : payment.raffles?.title}
            </p>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <dl className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
              <dd className="break-all font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {payment.raffle_entries.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Boletos emitidos</p>
            <p className="mt-2 font-mono text-sm leading-7">{payment.raffle_entries.map((entry) => `#${entry.ticket_number}`).join('  ')}</p>
            {payment.raffles && <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Fecha del sorteo: {formatDateTime(payment.raffles.draw_date)}</p>}
          </div>
        )}

        {payment.subscriptions && (
          <p className="text-sm">
            Vigencia del plan: {formatDateTime(payment.subscriptions.current_period_start)} – {formatDateTime(payment.subscriptions.current_period_end)}
          </p>
        )}

        {payment.status === 'pending' && <Notice tone="warning">Tu pago está en revisión. Te avisaremos cuando lo verifiquemos.</Notice>}
        {payment.status === 'rejected' && (
          <Notice tone="danger" title="Pago no verificado">
            {payment.rejection_reason}. Si crees que es un error, <Link href="/ayuda#contacto" className="underline">contáctanos</Link>.
          </Notice>
        )}

        {payment.status === 'approved' && (
          <p className="flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
            Pago verificado por nuestro equipo. Este comprobante resume tu participación; los números de boleto también figuran en la lista pública de boletos del sorteo.
          </p>
        )}
      </Card>
    </div>
  );
}
