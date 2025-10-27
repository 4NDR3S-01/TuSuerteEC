"use client";

import React, { useEffect, useMemo, useState } from 'react';
import StripePaymentForm from './stripe-payment-form';
import { loadStripe } from '@stripe/stripe-js';

type PlanLite = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description?: string | null;
};

type Props = {
  plan: PlanLite;
  onClose: () => void;
  onSuccess?: (subscriptionId: string) => void;
};

export default function StripeSubscriptionModal({ plan, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [idempotencyKey] = useState<string>(() => {
    try {
      // Use the browser's crypto.randomUUID when available
      return (globalThis as any).crypto?.randomUUID?.() || String(Math.random()).slice(2);
    } catch (e) {
      return String(Math.random()).slice(2);
    }
  });

  const stripePromise = useMemo(() => {
    const key = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '') as string;
    if (!key) return null;
    return loadStripe(key);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setError(null);
    setClientSecret(null);
    setSubscriptionId(null);
    setSuccess(false);
    setFinalizing(false);
    setLoading(true);

    async function init() {
      try {
        const res = await fetch('/api/stripe/create-subscription-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id, idempotencyKey }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId ?? null);
          setError(null);
        } else {
          setError(data?.error || 'No se pudo iniciar la suscripción');
        }
      } catch (e: any) {
        if (cancelled || e?.name === 'AbortError') return;
        setError(e?.message || 'Error al crear la intención');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [plan.id, idempotencyKey]);

  const handlePaymentSuccess = async (paymentIntentId?: string) => {
    setError(null);
    setFinalizing(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/stripe/finalize-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          paymentIntentId: paymentIntentId ?? null,
          planId: plan.id,
          idempotencyKey,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'No se pudo finalizar la suscripción. Inténtalo de nuevo.');
        return;
      }

      const resolvedSubId = (data?.subscriptionId as string | undefined) ?? subscriptionId ?? null;
      if (resolvedSubId) {
        setSubscriptionId(resolvedSubId);
      }

      setSuccess(true);
      setTimeout(() => {
        if (resolvedSubId) {
          onSuccess?.(resolvedSubId);
        } else {
          onSuccess?.('');
        }
      }, 1400);
    } catch (e: any) {
      setError(e?.message || 'Error al finalizar la suscripción');
    } finally {
      setFinalizing(false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[color:var(--background)] p-6 border border-[color:var(--border)] shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">Suscribirse — {plan.name}</h3>
            <p className="text-sm text-[color:var(--muted-foreground)]">{plan.description}</p>
          </div>
          <button onClick={onClose} className="text-[color:var(--muted-foreground)]">Cerrar</button>
        </div>

        <div className="mt-6">
          {loading && <div className="text-sm text-[color:var(--muted-foreground)]">Cargando el formulario de pago...</div>}
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

          {!loading && !clientSecret && !error && (
            <div className="mt-4 text-sm text-[color:var(--muted-foreground)]">Preparando formulario de pago...</div>
          )}

          {clientSecret ? (
            <div className="mt-6">
              <StripePaymentForm
                clientSecret={clientSecret}
                submitLabel={`Pagar ${plan.price} ${plan.currency}`}
                onSuccess={(paymentIntentId?: string) => handlePaymentSuccess(paymentIntentId)}
                onError={(msg) => setError(msg)}
                onCancel={() => onClose()}
              />
              {(finalizing || success) && (
                <div
                  className={`mt-4 rounded-md border p-3 text-sm ${
                    success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {success ? 'Suscripción creada. Actualizando tu cuenta...' : 'Pago confirmado. Asignando suscripción...'}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                Si el formulario demora en cargar automáticamente, recarga la página o contacta a soporte.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
