'use client';

import { useState } from 'react';
import { Check, Copy, Landmark, QrCode } from 'lucide-react';
import type { PaymentMethod } from '../../lib/payments/types';
import { formatPrice } from '../../lib/raffle/labels';

function CopyValue({ label, value }: { label: string; value?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-[color:var(--muted-foreground)]">{label}</p>
        <p className="break-all font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* el navegador no permite copiar: la persona puede seleccionar el texto */
          }
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        aria-label={`Copiar ${label.toLowerCase()}`}
      >
        {copied ? <Check className="size-4 text-[color:var(--success)]" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

/** Datos para transferir o escanear, con el monto exacto a pagar */
export function PaymentMethodDetails({ method, amount, currency = 'USD' }: { method: PaymentMethod; amount: number; currency?: string }) {
  const manual = method.config?.manual;
  const qr = method.config?.qr;

  return (
    <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--card)] p-4">
        <span className="text-sm text-[color:var(--muted-foreground)]">Monto exacto a pagar</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">{formatPrice(amount, currency)}</span>
      </div>

      {method.type === 'manual_transfer' && manual && (
        <div className="divide-y divide-[color:var(--border)] rounded-xl bg-[color:var(--card)] px-4">
          <p className="flex items-center gap-2 py-3 text-sm font-semibold">
            <Landmark className="size-4 text-[color:var(--accent)]" aria-hidden /> Datos para la transferencia
          </p>
          <CopyValue label="Banco" value={manual.bankName} />
          <CopyValue label="Tipo de cuenta" value={manual.accountType} />
          <CopyValue label="Número de cuenta" value={manual.accountNumber} />
          <CopyValue label="Beneficiario" value={manual.beneficiary} />
          <CopyValue label="Cédula o RUC" value={manual.identification} />
        </div>
      )}

      {method.type === 'qr_code' && qr && (
        <div className="space-y-3 rounded-xl bg-[color:var(--card)] p-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <QrCode className="size-4 text-[color:var(--accent)]" aria-hidden /> Escanea con {qr.provider || 'tu app de pagos'}
          </p>
          {qr.qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.qrImageUrl} alt={`Código QR de pago ${qr.provider ?? ''}`} className="mx-auto size-52 rounded-xl border border-[color:var(--border)] bg-white object-contain p-2" />
          ) : (
            <p className="text-sm text-[color:var(--muted-foreground)]">El código QR no está disponible. Elige otro método.</p>
          )}
          <div className="text-left">
            <CopyValue label="Cuenta" value={qr.accountId} />
            <CopyValue label="Titular" value={qr.accountName} />
          </div>
        </div>
      )}

      {(manual?.instructions || qr?.instructions || method.instructions) && (
        <p className="whitespace-pre-line text-sm text-[color:var(--muted-foreground)]">
          {manual?.instructions || qr?.instructions || method.instructions}
        </p>
      )}
    </div>
  );
}
