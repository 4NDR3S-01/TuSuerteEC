'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, Receipt, Search, X, XCircle } from 'lucide-react';
import { approveManualPayment, rejectManualPayment } from '../../lib/payments/approve-manual-payment';
import { useToast } from '../../hooks/use-toast';
import { PAYMENT_STATUS, RAFFLE_STATUS, formatDateTime, formatPrice } from '../../lib/raffle/labels';
import { Badge, Button, Card, EmptyState, Field, SectionHeader, inputStyles } from '../ui/kit';
import { cn } from '../../lib/utils';

type PaymentTransaction = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  subtotal: number | null;
  discount_amount: number;
  currency: string;
  receipt_url: string | null;
  receipt_reference: string | null;
  payment_method_id: string;
  status: string;
  reviewed_at: string | null;
  admin_comment: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string; email: string; id_number: string } | null;
  payment_methods: { name: string; type: string } | null;
  raffles: { id: string; title: string; status: string } | null;
  subscriptions: { plans: { name: string } | null } | null;
  discount_codes: { code: string } | null;
  reviewer: { full_name: string } | null;
};

type Props = {
  readonly initialTransactions: PaymentTransaction[];
  /** Para impedir (también en la interfaz) que alguien revise sus propios pagos */
  readonly currentUserId?: string;
};

const REJECTION_REASONS = [
  'El monto no coincide con el valor a pagar',
  'No encontramos la transferencia en el estado de cuenta',
  'El comprobante es ilegible o está incompleto',
  'El comprobante ya fue usado en otra solicitud',
  'El sorteo cerró antes de verificar el pago; se hará la devolución',
];

function concept(transaction: PaymentTransaction) {
  const metadata = transaction.metadata ?? {};
  if (transaction.transaction_type === 'subscription') return `Plan ${String(metadata.plan_name ?? transaction.subscriptions?.plans?.name ?? '')}`;
  return `${Number(metadata.tickets_requested ?? 1)} boleto(s) · ${transaction.raffles?.title ?? 'Sorteo'}`;
}

export default function PaymentTransactionsManagement({ initialTransactions, currentUserId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  // Referencias repetidas en el mismo método (posible reutilización de un comprobante)
  const duplicateRefs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of initialTransactions) {
      if (!transaction.receipt_reference || transaction.status === 'rejected') continue;
      const key = `${transaction.payment_method_id}:${transaction.receipt_reference.toUpperCase()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [initialTransactions]);

  const isDuplicate = (transaction: PaymentTransaction) =>
    Boolean(transaction.receipt_reference) &&
    (duplicateRefs.get(`${transaction.payment_method_id}:${transaction.receipt_reference!.toUpperCase()}`) ?? 0) > 1;

  const counts = useMemo(
    () => ({
      pending: initialTransactions.filter((t) => t.status === 'pending').length,
      approved: initialTransactions.filter((t) => t.status === 'approved' || t.status === 'completed').length,
      rejected: initialTransactions.filter((t) => t.status === 'rejected').length,
    }),
    [initialTransactions],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return initialTransactions.filter((transaction) => {
      const statusOk =
        statusFilter === 'all' ||
        transaction.status === statusFilter ||
        (statusFilter === 'approved' && transaction.status === 'completed');
      if (!statusOk) return false;
      if (!term) return true;
      return [transaction.profiles?.full_name, transaction.profiles?.email, transaction.profiles?.id_number, transaction.receipt_reference, transaction.id, transaction.raffles?.title]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [initialTransactions, statusFilter, search]);

  const closeReview = () => {
    setAction(null);
    setReason('');
    setComment('');
  };

  const submitReview = async () => {
    if (!selected || !action) return;
    if (action === 'reject' && reason.trim().length < 3) {
      showToast({ type: 'error', description: 'Indica el motivo del rechazo.' });
      return;
    }
    setBusy(true);
    const result =
      action === 'approve'
        ? await approveManualPayment({ transactionId: selected.id, adminComment: comment || undefined })
        : await rejectManualPayment({ transactionId: selected.id, rejectionReason: reason.trim(), adminComment: comment || undefined });
    setBusy(false);

    if (!result.success) {
      showToast({ type: 'error', description: result.error ?? 'No se pudo procesar la revisión.' });
      return;
    }
    showToast({ type: 'success', description: result.message ?? 'Revisión registrada.' });
    closeReview();
    setSelected(null);
    router.refresh();
  };

  const tabs = [
    { value: 'pending', label: `Por revisar (${counts.pending})` },
    { value: 'approved', label: `Aprobados (${counts.approved})` },
    { value: 'rejected', label: `Rechazados (${counts.rejected})` },
    { value: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        title="Pagos"
        description="Compara cada comprobante con el estado de cuenta antes de aprobar. Al aprobar se emiten los boletos o se activa el plan."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado del pago">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold',
                statusFilter === tab.value ? 'bg-[color:var(--foreground)] text-[color:var(--background)]' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Buscar pagos</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, cédula, correo o referencia" className={`${inputStyles} pl-10`} />
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Receipt} title={statusFilter === 'pending' ? 'No hay pagos por revisar' : 'No hay pagos con estos filtros'} />
      ) : (
        <Card className="divide-y divide-[color:var(--border)]">
          {visible.map((transaction) => {
            const status = PAYMENT_STATUS[transaction.status] ?? PAYMENT_STATUS.pending;
            return (
              <button
                key={transaction.id}
                type="button"
                onClick={() => setSelected(transaction)}
                className="flex w-full flex-col gap-2 p-4 text-left hover:bg-[color:var(--muted)]/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{transaction.profiles?.full_name ?? 'Usuario'} <span className="font-normal text-[color:var(--muted-foreground)]">· {transaction.profiles?.id_number}</span></p>
                  <p className="text-sm text-[color:var(--muted-foreground)]">{concept(transaction)}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {formatDateTime(transaction.created_at)} · {transaction.payment_methods?.name} · Ref. {transaction.receipt_reference ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {isDuplicate(transaction) && <Badge tone="danger"><AlertTriangle aria-hidden /> Referencia repetida</Badge>}
                  {transaction.user_id === currentUserId && <Badge tone="neutral">Pago propio</Badge>}
                  <span className="font-bold tabular-nums">{formatPrice(transaction.amount, transaction.currency)}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              </button>
            );
          })}
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={() => !busy && setSelected(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--background)] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="payment-detail-title" className="text-xl font-bold">Detalle del pago</h2>
                <p className="font-mono text-xs text-[color:var(--muted-foreground)]">{selected.id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-[color:var(--muted)]" aria-label="Cerrar">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {isDuplicate(selected) && (
              <div className="mt-4 flex gap-2 rounded-xl bg-[color:var(--danger-soft)] p-3 text-sm text-[color:var(--danger)]">
                <AlertTriangle className="size-5 shrink-0" aria-hidden /> Esta referencia aparece en otra solicitud vigente del mismo método. Revisa antes de aprobar.
              </div>
            )}

            <dl className="mt-5 divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] text-sm">
              {[
                ['Participante', `${selected.profiles?.full_name ?? '—'} · ${selected.profiles?.id_number ?? ''}`],
                ['Correo', selected.profiles?.email ?? '—'],
                ['Concepto', concept(selected)],
                ['Método', selected.payment_methods?.name ?? '—'],
                ['Referencia', selected.receipt_reference ?? '—'],
                ...(selected.discount_amount > 0
                  ? [
                      ['Subtotal', formatPrice(selected.subtotal ?? selected.amount + selected.discount_amount, selected.currency)],
                      [`Descuento ${selected.discount_codes?.code ?? ''}`, `−${formatPrice(selected.discount_amount, selected.currency)}`],
                    ]
                  : []),
                ['Monto que debe figurar en la cuenta', formatPrice(selected.amount, selected.currency)],
                ['Solicitado', formatDateTime(selected.created_at)],
                ...(selected.raffles ? [['Estado del sorteo', RAFFLE_STATUS[selected.raffles.status]?.label ?? selected.raffles.status]] : []),
                ...(selected.reviewed_at ? [['Revisado', `${formatDateTime(selected.reviewed_at)} por ${selected.reviewer?.full_name ?? '—'}`]] : []),
                ...(selected.rejection_reason ? [['Motivo del rechazo', selected.rejection_reason]] : []),
                ...(selected.admin_comment ? [['Comentario interno', selected.admin_comment]] : []),
                ...(selected.metadata?.notes ? [['Nota del participante', String(selected.metadata.notes)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                  <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <p className="text-sm font-semibold">Comprobante</p>
              {selected.receipt_url ? (
                selected.receipt_url.endsWith('.pdf') ? (
                  <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]">
                    <FileText className="size-4" aria-hidden /> Descargar PDF
                  </a>
                ) : (
                  <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.receipt_url} alt="Comprobante de pago" className="max-h-96 w-full rounded-xl border border-[color:var(--border)] object-contain" />
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]"><ExternalLink className="size-3" aria-hidden /> Abrir en tamaño completo</span>
                  </a>
                )
              ) : (
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">El participante no adjuntó archivo.</p>
              )}
            </div>

            {selected.status === 'pending' && (
              <div className="mt-6 space-y-4 border-t border-[color:var(--border)] pt-5">
                {selected.user_id === currentUserId ? (
                  <p className="text-sm text-[color:var(--muted-foreground)]">Este pago es tuyo: otra persona del equipo debe revisarlo.</p>
                ) : action === null ? (
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={() => setAction('approve')}><CheckCircle2 aria-hidden /> Aprobar</Button>
                    <Button variant="secondary" className="flex-1" onClick={() => setAction('reject')}><XCircle aria-hidden /> Rechazar</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {action === 'approve' ? (
                      <p className="text-sm">
                        Confirmo que recibí <strong>{formatPrice(selected.amount, selected.currency)}</strong> con la referencia <strong>{selected.receipt_reference}</strong>.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {REJECTION_REASONS.map((preset) => (
                            <button key={preset} type="button" onClick={() => setReason(preset)} className={cn('rounded-lg border px-2.5 py-1 text-xs', reason === preset ? 'border-[color:var(--accent)] text-[color:var(--accent)]' : 'border-[color:var(--border)]')}>
                              {preset}
                            </button>
                          ))}
                        </div>
                        <Field label="Motivo (lo verá el participante)" htmlFor="reject-reason" required>
                          <textarea id="reject-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={2} className={inputStyles} />
                        </Field>
                      </>
                    )}
                    <Field label="Comentario interno (opcional)" htmlFor="review-comment">
                      <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={2} className={inputStyles} />
                    </Field>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={closeReview} disabled={busy}>Volver</Button>
                      <Button variant={action === 'approve' ? 'primary' : 'danger'} className="flex-1" onClick={submitReview} disabled={busy}>
                        {busy && <Loader2 className="animate-spin" aria-hidden />}
                        {action === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
