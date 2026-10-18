'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Minus, Plus, Tag, X } from 'lucide-react';
import { createManualTransferPayment, previewRaffleDiscount } from '../../app/(app)/app/sorteos/[id]/actions';
import { uploadFile } from '../../lib/upload-client';
import type { PaymentMethod } from '../../lib/payments/types';
import { formatPrice } from '../../lib/raffle/labels';
import { PaymentMethodDetails } from '../payments/payment-method-details';
import { ReceiptInput } from '../payments/receipt-input';
import { Button, ButtonLink, Field, Input, Notice } from '../ui/kit';
import { cn } from '../../lib/utils';

type Props = {
  raffleId: string;
  raffleTitle: string;
  ticketPrice: number;
  /** Boletos que todavía puede pedir (null = sin límite) */
  remainingAllowance: number | null;
  paymentMethods: PaymentMethod[];
};

const MAX_PER_REQUEST = 100;
const QUICK_PICKS = [1, 3, 5, 10];

function cents(value: number) {
  return Math.round(value * 100);
}

/**
 * Compra de boletos en tres pasos: cantidad (con descuento), pago y comprobante.
 * El total que ve la persona lo recalcula el servidor; si no coincide, la solicitud se rechaza.
 */
export function RafflePurchasePanel({ raffleId, raffleTitle, ticketPrice, remainingAllowance, paymentMethods }: Props) {
  const router = useRouter();
  const maxTickets = Math.max(0, Math.min(MAX_PER_REQUEST, remainingAllowance ?? MAX_PER_REQUEST));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tickets, setTickets] = useState(Math.min(1, maxTickets));
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<{ code: string; discount: number; total: number; label: string; tickets: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; tickets: number } | null>(null);

  const method = paymentMethods.find((item) => item.id === methodId) ?? null;
  const subtotal = (cents(ticketPrice) * tickets) / 100;
  // Un descuento calculado para otra cantidad de boletos ya no es válido
  const activeDiscount = discount && discount.tickets === tickets ? discount : null;
  const total = activeDiscount ? activeDiscount.total : subtotal;
  const requiresProof = method
    ? method.type === 'manual_transfer'
      ? method.config?.manual?.requiresProof ?? true
      : method.config?.qr?.requiresProof ?? true
    : true;

  const quickPicks = useMemo(() => QUICK_PICKS.filter((value) => value <= maxTickets), [maxTickets]);

  if (maxTickets === 0) {
    return (
      <Notice tone="info" title="Alcanzaste el máximo de participaciones">
        Ya tienes todos los boletos permitidos para este sorteo (incluidos los pagos en revisión).
      </Notice>
    );
  }

  if (paymentMethods.length === 0) {
    return <Notice tone="warning">Por ahora no hay métodos de pago disponibles para sorteos. Vuelve a intentarlo más tarde.</Notice>;
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-12 text-[color:var(--success)]" aria-hidden />
        <div>
          <p className="text-lg font-bold">Recibimos tu solicitud</p>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {done.tickets} boleto(s) por {formatPrice(done.amount)}. Te avisaremos cuando verifiquemos el pago; tus números aparecerán en &quot;Mis boletos&quot;.
          </p>
        </div>
        <ButtonLink href="/app/boletos" block>Ver mis boletos y pagos</ButtonLink>
      </div>
    );
  }

  const applyCode = async () => {
    setDiscountError(null);
    if (!codeInput.trim()) return;
    setCheckingCode(true);
    const result = await previewRaffleDiscount(raffleId, tickets, codeInput).catch(() => ({ success: false, error: 'No pudimos validar el código.' }));
    setCheckingCode(false);
    if (!result.success || !('total' in result)) {
      setDiscount(null);
      setDiscountError(result.error ?? 'Código no válido.');
      return;
    }
    setDiscount({ code: result.code, discount: result.discount, total: result.total, label: result.label, tickets });
  };

  const submit = async () => {
    setError(null);
    if (!method) return setError('Elige un método de pago.');
    if (reference.trim().length < 3) return setError('Ingresa el número de comprobante o de transacción.');
    if (requiresProof && !receipt) return setError('Adjunta la foto o el PDF del comprobante.');
    if (!confirmed) return setError(`Confirma que pagaste exactamente ${formatPrice(total)}.`);

    setSubmitting(true);
    try {
      const receiptUrl = receipt ? await uploadFile(receipt, 'payment-receipts') : undefined;
      const result = await createManualTransferPayment(raffleId, {
        paymentMethodId: method.id,
        reference: reference.trim(),
        notes: notes.trim() || undefined,
        receiptUrl,
        tickets,
        amount: total,
        discountCode: activeDiscount?.code,
      });
      if (!result.success) {
        setError(result.error ?? 'No pudimos registrar tu pago.');
        return;
      }
      setDone({ amount: result.amount ?? total, tickets });
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No pudimos subir el comprobante.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-3 gap-2 text-xs font-semibold" aria-label="Pasos de la compra">
        {['Boletos', 'Pago', 'Comprobante'].map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? 'step' : undefined}
            className={cn(
              'rounded-lg border px-2 py-2 text-center',
              step === index + 1
                ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                : step > index + 1
                  ? 'border-[color:var(--success)]/30 text-[color:var(--success)]'
                  : 'border-[color:var(--border)] text-[color:var(--muted-foreground)]',
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <p id="tickets-label" className="text-sm font-semibold">¿Cuántos boletos quieres?</p>
            <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="tickets-label">
              <Button variant="secondary" size="icon" onClick={() => setTickets((value) => Math.max(1, value - 1))} disabled={tickets <= 1} aria-label="Quitar un boleto">
                <Minus aria-hidden />
              </Button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxTickets}
                value={tickets}
                onChange={(event) => setTickets(Math.min(maxTickets, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                className="h-12 w-20 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] text-center text-xl font-bold tabular-nums"
                aria-label="Cantidad de boletos"
              />
              <Button variant="secondary" size="icon" onClick={() => setTickets((value) => Math.min(maxTickets, value + 1))} disabled={tickets >= maxTickets} aria-label="Agregar un boleto">
                <Plus aria-hidden />
              </Button>
            </div>
            {quickPicks.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPicks.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTickets(value)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-semibold',
                      tickets === value ? 'border-[color:var(--accent)] text-[color:var(--accent)]' : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
            {remainingAllowance !== null && (
              <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Puedes pedir hasta {maxTickets} boleto(s) más en este sorteo.</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="discount-code" className="text-sm font-semibold">Código de descuento <span className="font-normal text-[color:var(--muted-foreground)]">(opcional)</span></label>
            {activeDiscount ? (
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-[color:var(--success)]">
                  <Tag className="size-4" aria-hidden /> {activeDiscount.code} · {activeDiscount.label}
                </span>
                <button type="button" onClick={() => { setDiscount(null); setCodeInput(''); }} className="rounded-lg p-1 hover:bg-black/5" aria-label="Quitar código">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input id="discount-code" value={codeInput} onChange={(event) => setCodeInput(event.target.value.toUpperCase())} placeholder="CÓDIGO" maxLength={40} className="uppercase" />
                <Button variant="secondary" onClick={applyCode} disabled={checkingCode || !codeInput.trim()}>
                  {checkingCode ? <Loader2 className="animate-spin" aria-hidden /> : null} Aplicar
                </Button>
              </div>
            )}
            {discount && !activeDiscount && <p className="text-xs text-[color:var(--warning)]">Cambiaste la cantidad: vuelve a aplicar el código.</p>}
            {discountError && <p role="alert" className="text-xs font-medium text-[color:var(--danger)]">{discountError}</p>}
          </div>

          <dl className="space-y-2 rounded-xl bg-[color:var(--muted)]/50 p-4 text-sm">
            <div className="flex justify-between"><dt>{tickets} × {formatPrice(ticketPrice)}</dt><dd className="tabular-nums">{formatPrice(subtotal)}</dd></div>
            {activeDiscount && (
              <div className="flex justify-between text-[color:var(--success)]"><dt>Descuento</dt><dd className="tabular-nums">−{formatPrice(activeDiscount.discount)}</dd></div>
            )}
            <div className="flex justify-between border-t border-[color:var(--border)] pt-2 text-base font-bold"><dt>Total a pagar</dt><dd className="tabular-nums">{formatPrice(total)}</dd></div>
          </dl>

          <Button size="lg" block onClick={() => setStep(2)}>Continuar al pago</Button>
        </div>
      )}

      {step === 2 && method && (
        <div className="space-y-5">
          {paymentMethods.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Método de pago</legend>
              <div className="grid gap-2">
                {paymentMethods.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm',
                      item.id === methodId ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)]',
                    )}
                  >
                    <input type="radio" name="method" value={item.id} checked={item.id === methodId} onChange={() => setMethodId(item.id)} className="accent-[color:var(--accent)]" />
                    <span>
                      <span className="block font-semibold">{item.name}</span>
                      {item.description && <span className="text-xs text-[color:var(--muted-foreground)]">{item.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <PaymentMethodDetails method={method} amount={total} currency={method.config?.currency ?? 'USD'} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Atrás</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Ya pagué, subir comprobante</Button>
          </div>
        </div>
      )}

      {step === 3 && method && (
        <div className="space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="Número de comprobante o transacción" htmlFor="payment-reference" hint="Aparece en el comprobante de tu banco o app" required>
            <Input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} autoComplete="off" />
          </Field>
          <ReceiptInput file={receipt} onChange={setReceipt} required={requiresProof} />
          <Field label="Nota para el equipo" htmlFor="payment-notes" hint="Opcional, por ejemplo: pagué desde la cuenta de un familiar">
            <textarea id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 py-3 text-sm" />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-[color:var(--accent)]" />
            <span>
              Confirmo que pagué exactamente <strong>{formatPrice(total)}</strong> por {tickets} boleto(s) de &quot;{raffleTitle}&quot;.
            </span>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)} disabled={submitting}>Atrás</Button>
            <Button className="flex-1" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? 'Enviando…' : 'Enviar para verificación'}
            </Button>
          </div>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Al enviar aceptas las <Link href="/bases" target="_blank" className="underline">bases</Link>. Si el sorteo cierra antes de verificar tu pago, te devolvemos el dinero.
          </p>
        </div>
      )}
    </div>
  );
}
