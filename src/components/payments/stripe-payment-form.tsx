"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';

type Props = {
  clientSecret: string;
  onSuccess?: (paymentIntentId?: string) => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function StripePaymentForm(props: Props) {
  const { clientSecret } = props;
  const [stripeModule, setStripeModule] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Ahora que la dependencia está instalada, usamos la importación dinámica normal.
        const mod = await import('@stripe/react-stripe-js');
        if (mounted) setStripeModule(mod);
      } catch (err) {
        console.warn('Stripe React module not available (dynamic import failed):', err);
        if (mounted)
          setLoadError(
            'La librería de Stripe no está instalada. Para habilitar pagos con tarjeta instala `@stripe/react-stripe-js` en tu proyecto.'
          );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const options: StripeElementsOptions = useMemo(() => ({ clientSecret }), [clientSecret]);

  if (loadError) {
    return <div className="p-4 text-sm text-amber-700">{loadError}</div>;
  }

  if (!stripeModule) {
    return <div className="p-4 text-sm text-[color:var(--muted-foreground)]">Cargando formulario de pago...</div>;
  }

  const Elements = stripeModule.Elements;
  const CardElement = stripeModule.CardElement;
  const useStripeHook = stripeModule.useStripe;
  const useElementsHook = stripeModule.useElements;

  return (
    <Elements stripe={stripePromise} options={options}>
      <InnerPaymentForm
        CardElement={CardElement}
        useStripeHook={useStripeHook}
        useElementsHook={useElementsHook}
        {...props}
      />
    </Elements>
  );
}

function InnerPaymentForm({
  CardElement,
  useStripeHook,
  useElementsHook,
  clientSecret,
  onSuccess,
  onError,
  onCancel,
  submitLabel,
}: any) {
  const stripe = useStripeHook();
  const elements = useElementsHook();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryConfirmPayment = async (maxAttempts = 3) => {
    if (!stripe || !elements) throw new Error('Stripe no inicializado');
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) throw new Error('Card element not found');

    let attempt = 0;
    const transientTypes = new Set(['api_connection_error', 'idempotency_error', 'rate_limit', 'internal_error']);

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

        if (result.error) {
          const errType = (result.error.type as string | undefined) || '';
          const code = (result.error.code as string | undefined) || '';
          if ((errType && transientTypes.has(errType)) || code === 'processing_error') {
            if (attempt < maxAttempts) {
              await new Promise((res) => setTimeout(res, 500 * attempt));
              continue;
            }
          }
          throw result.error;
        }

        return result;
      } catch (err) {
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 500 * attempt));
          continue;
        }
        throw err;
      }
    }
    throw new Error('No se pudo confirmar el pago después de varios intentos');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe no está inicializado. Recarga la página.');
      setIsProcessing(false);
      return;
    }

    try {
      const result = await tryConfirmPayment(3);

      if ((result as any).error) {
        const msg = (result as any).error.message || 'Error al procesar el pago.';
        setError(msg);
        onError?.(msg);
      } else if ((result as any).paymentIntent && (result as any).paymentIntent.status === 'succeeded') {
        onSuccess?.((result as any).paymentIntent.id);
      } else {
        setError('Pago no completado.');
        onError?.('Pago no completado');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border p-4">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isProcessing}
          className="flex-1 py-2 px-4 rounded-lg bg-[color:var(--accent)] text-white font-semibold"
        >
          {isProcessing ? 'Procesando...' : submitLabel || 'Pagar con tarjeta'}
        </button>
        <button type="button" onClick={() => onCancel?.()} className="py-2 px-4 rounded-lg border">
          Cancelar
        </button>
      </div>
    </form>
  );
}
