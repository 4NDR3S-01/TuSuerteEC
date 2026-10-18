'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Tag, X } from 'lucide-react';
import type { PaymentMethod } from '../../lib/payments/types';
import { createPlanManualPayment, previewPlanDiscount } from '../../lib/actions/subscriptions';
import { uploadFile } from '../../lib/upload-client';
import { formatPrice } from '../../lib/raffle/labels';
import { PaymentMethodDetails } from './payment-method-details';
import { ReceiptInput } from './receipt-input';
import { Button, Field, Input, Notice } from '../ui/kit';
import { cn } from '../../lib/utils';

type PlanLite = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string | null;
};

type ManualSubscriptionModalProps = {
  plan: PlanLite;
  paymentMethods: PaymentMethod[];
  isRenewal?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

/** Pago manual de un plan: datos de pago con el monto exacto, comprobante y código de descuento opcional */
export default function ManualSubscriptionModal({ plan, paymentMethods, isRenewal, onClose, onSuccess }: ManualSubscriptionModalProps) {
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<{ code: string; total: number; discount: number; label: string } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const method = paymentMethods.find((item) => item.id === methodId) ?? null;
  const total = discount?.total ?? plan.price;
  const requiresProof = method
    ? method.type === 'manual_transfer'
      ? method.config?.manual?.requiresProof ?? true
      : method.config?.qr?.requiresProof ?? true
    : true;

  // Cerrar con Escape y mover el foco al diálogo
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const applyCode = async () => {
    setCodeError(null);
    setCheckingCode(true);
    const result = await previewPlanDiscount(plan.id, codeInput).catch(() => ({ success: false, error: 'No pudimos validar el código.' }));
    setCheckingCode(false);
    if (!result.success || !('total' in result) || result.total === undefined) {
      setDiscount(null);
      setCodeError(result.error ?? 'Código no válido.');
      return;
    }
    setDiscount({ code: codeInput.trim().toUpperCase(), total: result.total, discount: result.discount ?? 0, label: result.label ?? '' });
  };

  const submit = async () => {
    setError(null);
    if (!method) return setError('Elige un método de pago.');
    if (reference.trim().length < 3) return setError('Ingresa el número de comprobante o de transacción.');
    if (requiresProof && !receipt) return setError('Adjunta la foto o el PDF del comprobante.');

    setSubmitting(true);
    try {
      const receiptUrl = receipt ? await uploadFile(receipt, 'payment-receipts') : undefined;
      const result = await createPlanManualPayment(plan.id, {
        paymentMethodId: method.id,
        reference: reference.trim(),
        receiptUrl,
        notes: notes.trim() || undefined,
        discountCode: discount?.code,
      });
      if (!result.success) return setError(result.error ?? 'No se pudo registrar la solicitud.');
      setSuccess(result.message ?? 'Solicitud registrada.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No pudimos subir el comprobante.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[color:var(--border)] bg-[color:var(--background)] p-6 shadow-2xl outline-none sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="plan-modal-title" className="text-xl font-bold">{isRenewal ? 'Renovar' : 'Suscribirme a'} {plan.name}</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {formatPrice(plan.price, plan.currency)} por {plan.interval === 'year' ? 'año' : 'mes'} · sin cobros automáticos
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]" aria-label="Cerrar">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {success ? (
          <div className="mt-6 space-y-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-[color:var(--success)]" aria-hidden />
            <p className="text-sm">{success}</p>
            <Button onClick={() => (onSuccess ? onSuccess() : onClose())}>Entendido</Button>
          </div>
        ) : paymentMethods.length === 0 ? (
          <Notice tone="warning" className="mt-6">Aún no hay métodos de pago habilitados para planes. Intenta más tarde.</Notice>
        ) : (
          <div className="mt-6 space-y-5">
            {isRenewal && <Notice tone="info">El nuevo período comenzará cuando termine el actual.</Notice>}

            <div className="space-y-2">
              <label htmlFor="plan-code" className="text-sm font-semibold">Código de descuento <span className="font-normal text-[color:var(--muted-foreground)]">(opcional)</span></label>
              {discount ? (
                <div className="flex items-center justify-between rounded-xl border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--success)]">
                  <span className="flex items-center gap-2"><Tag className="size-4" aria-hidden /> {discount.code} · {discount.label}</span>
                  <button type="button" onClick={() => setDiscount(null)} aria-label="Quitar código" className="rounded p-1"><X className="size-4" aria-hidden /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input id="plan-code" value={codeInput} onChange={(event) => setCodeInput(event.target.value.toUpperCase())} placeholder="CÓDIGO" maxLength={40} />
                  <Button variant="secondary" onClick={applyCode} disabled={checkingCode || !codeInput.trim()}>
                    {checkingCode && <Loader2 className="animate-spin" aria-hidden />} Aplicar
                  </Button>
                </div>
              )}
              {codeError && <p role="alert" className="text-xs font-medium text-[color:var(--danger)]">{codeError}</p>}
            </div>

            {paymentMethods.length > 1 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Método de pago</legend>
                {paymentMethods.map((item) => (
                  <label key={item.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm', item.id === methodId ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)]')}>
                    <input type="radio" name="plan-method" checked={item.id === methodId} onChange={() => setMethodId(item.id)} className="accent-[color:var(--accent)]" />
                    <span className="font-semibold">{item.name}</span>
                  </label>
                ))}
              </fieldset>
            )}

            {method && <PaymentMethodDetails method={method} amount={total} currency={plan.currency} />}

            {error && <Notice tone="danger">{error}</Notice>}
            <Field label="Número de comprobante o transacción" htmlFor="plan-reference" required>
              <Input id="plan-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} autoComplete="off" />
            </Field>
            <ReceiptInput file={receipt} onChange={setReceipt} required={requiresProof} />
            <Field label="Nota para el equipo" htmlFor="plan-notes" hint="Opcional">
              <textarea id="plan-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={500} className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--card)] px-4 py-3 text-sm" />
            </Field>
            <Button size="lg" block onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? 'Enviando…' : `Enviar pago de ${formatPrice(total, plan.currency)} para verificación`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
