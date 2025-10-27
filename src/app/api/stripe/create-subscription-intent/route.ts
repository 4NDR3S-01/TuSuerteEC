import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '../../../../lib/payments/stripe';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, idempotencyKey } = body;

    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });

    const supabase = await getSupabaseServerClient();

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, price, currency, interval, description')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      console.error('[create-subscription-intent] plan not found', planError);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get current user
    const userRes = await supabase.auth.getUser();
    const user = userRes.data.user;

    const stripe = getStripeClient();

    // Prevent multiple active subscriptions per user in our system
    const now = new Date().toISOString();
    const { data: existingActive } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user?.id ?? '')
      .eq('status', 'active')
      .gt('current_period_end', now)
      .limit(1)
      .maybeSingle();

    if (existingActive?.id) {
      return NextResponse.json({ error: 'Ya tienes una suscripción activa' }, { status: 409 });
    }

    const { data: paymentMethodRow, error: paymentMethodErr } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('type', 'stripe')
      .limit(1)
      .maybeSingle();

    if (paymentMethodErr) {
      console.error('[create-subscription-intent] could not fetch stripe payment method', paymentMethodErr);
      return NextResponse.json({ error: 'Error obteniendo configuración de Stripe' }, { status: 500 });
    }

    const paymentMethodId = paymentMethodRow?.id ?? null;
    if (!paymentMethodId) {
      console.error('[create-subscription-intent] stripe payment method not configured');
      return NextResponse.json({ error: 'No hay método de pago Stripe configurado' }, { status: 500 });
    }

    // Idempotency guard: if the client provided an idempotencyKey, try to
    // find an existing tracking transaction created previously for this key
    // and return its Stripe subscription/client secret instead of creating a
    // duplicate subscription.
    let trackedTxId: string | null = null;
    let trackedTxStatus: string | null = null;
    let trackedMetadata: Record<string, any> | null = null;
    let reusableCustomerId: string | null = null;
    let reusablePriceId: string | null = null;

    const mergeTrackedMetadata = async (patch: Record<string, any>) => {
      if (!trackedTxId) return;
      const nextMetadata = { ...(trackedMetadata ?? {}), ...patch };
      try {
        const { data: updated, error: mergeErr } = await supabase
          .from('payment_transactions')
          .update({ metadata: nextMetadata })
          .eq('id', trackedTxId)
          .select('metadata, status')
          .maybeSingle();

        if (mergeErr) {
          console.warn('[create-subscription-intent] could not merge metadata for tracked transaction', mergeErr);
          return;
        }

        trackedMetadata = updated?.metadata ?? nextMetadata;
        if (updated?.status) trackedTxStatus = updated.status;
      } catch (err) {
        console.warn('[create-subscription-intent] exception merging metadata for tracked transaction', err);
      }
    };

    if (idempotencyKey) {
      try {
        const { data: found } = await supabase
          .from('payment_transactions')
          .select('id, status, metadata, stripe_payment_intent_id')
          .eq('metadata->>idempotency_key', String(idempotencyKey))
          .limit(1)
          .maybeSingle();

        if (found) {
          trackedTxId = found.id ?? null;
          trackedTxStatus = found.status ?? null;
          const metadata = (found.metadata ?? {}) as Record<string, any>;
          trackedMetadata = metadata;

          reusableCustomerId = (metadata.stripe_customer_id as string | undefined) ?? null;
          reusablePriceId = (metadata.stripe_price_id as string | undefined) ?? null;

          const existingSubId = metadata.stripe_subscription_id as string | undefined;
          const existingPaymentIntentId =
            (metadata.payment_intent_id as string | undefined) ??
            (found.stripe_payment_intent_id as string | undefined);

          if (existingSubId) {
            // Attempt to fetch latest invoice/payment_intent to return a client secret
            try {
              const existingSub = await stripe.subscriptions.retrieve(existingSubId, {
                expand: ['latest_invoice.payment_intent'],
              });
              const latestInvoice: any = existingSub.latest_invoice;
              const paymentIntent = latestInvoice?.payment_intent;
              return NextResponse.json({
                subscriptionId: existingSubId,
                clientSecret: paymentIntent?.client_secret ?? null,
              });
            } catch (e) {
              // If Stripe call fails, fallthrough to normal creation
              console.warn('[create-subscription-intent] could not retrieve existing subscription from Stripe', e);
            }
          } else if (existingPaymentIntentId) {
            // If we only have a payment_intent recorded, retrieve the PI to get client_secret
            try {
              const pi = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
              return NextResponse.json({ subscriptionId: null, clientSecret: pi.client_secret ?? null });
            } catch (e) {
              console.warn('[create-subscription-intent] could not retrieve existing payment_intent', e);
            }
          } else if (found.status === 'processing') {
            return NextResponse.json(
              { error: 'Ya hay una solicitud de suscripción en curso, intenta de nuevo en unos segundos' },
              { status: 409 }
            );
          }
        }
      } catch (e) {
        console.warn('[create-subscription-intent] idempotency lookup failed', e);
      }
    }

    // Create (or reuse) a Stripe Customer for this user
    let customerId = reusableCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { supabase_user_id: user?.id ?? '' },
      });
      customerId = customer.id;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No se pudo crear el cliente en Stripe' }, { status: 500 });
    }

    if (
      trackedTxId &&
      customerId &&
      (!trackedMetadata?.stripe_customer_id || trackedMetadata.stripe_customer_id !== customerId)
    ) {
      await mergeTrackedMetadata({ stripe_customer_id: customerId });
    }

    // If we have an idempotencyKey and no existing trackedTxId, insert a
    // placeholder transaction with status 'creating' before calling Stripe.
    // This reduces race conditions where two servers call Stripe at the same
    // time with the same idempotency key.
    if (idempotencyKey && !trackedTxId) {
      try {
        const { data: inserted, error: insertErr } = await supabase
          .from('payment_transactions')
          .insert({
            user_id: user?.id ?? '',
            raffle_id: null,
            subscription_id: null,
            payment_method_id: paymentMethodId,
            transaction_type: 'subscription',
            amount: plan.price,
            currency: (plan.currency || 'USD').toUpperCase(),
            status: 'processing',
            stripe_payment_intent_id: null,
            stripe_payment_status: 'requires_confirmation',
            metadata: {
              idempotency_key: String(idempotencyKey),
              requested_at: new Date().toISOString(),
              plan_id: plan.id,
              plan_interval: plan.interval,
              plan_currency: plan.currency,
              plan_price: plan.price,
            },
          })
          .select('id, metadata, status')
          .single();

        if (insertErr) {
          console.warn('[create-subscription-intent] could not insert creating transaction', insertErr);
        } else if (inserted) {
          trackedTxId = inserted.id;
          trackedTxStatus = inserted.status ?? 'processing';
          trackedMetadata = inserted.metadata ?? {};
        }
      } catch (e) {
        console.warn('[create-subscription-intent] exception inserting creating transaction', e);
      }
    }

    // Create (or reuse) a Price resource before creating the subscription.
    let priceId = reusablePriceId;
    if (!priceId) {
      const price = await stripe.prices.create({
        unit_amount: Math.round((plan.price || 0) * 100),
        currency: (plan.currency || 'USD').toLowerCase(),
        recurring: { interval: plan.interval === 'year' ? 'year' : 'month' },
        product_data: {
          name: plan.name,
          metadata: { plan_id: plan.id },
        },
      });
      priceId = price.id;
    }

    if (trackedTxId && priceId && (!trackedMetadata?.stripe_price_id || trackedMetadata.stripe_price_id !== priceId)) {
      await mergeTrackedMetadata({ stripe_price_id: priceId });
    }

    let subscription: any = null;
    let paymentIntent: any = null;

    try {
      subscription = await stripe.subscriptions.create(
        {
          customer: customerId,
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: { plan_id: plan.id },
          items: [{ price: priceId, quantity: 1 }],
        },
        idempotencyKey ? { idempotencyKey: String(idempotencyKey) } : undefined
      );

      const latestInvoice: any = subscription.latest_invoice;
      paymentIntent = latestInvoice?.payment_intent;
    } catch (stripeErr: any) {
      const isStripe409 =
        stripeErr &&
        stripeErr.raw &&
        stripeErr.raw.type === 'invalid_request_error' &&
        stripeErr.raw.code === 'idempotency_key_in_use';
      const isStripeParamMismatch = stripeErr?.type === 'StripeIdempotencyError';

      if (idempotencyKey && (isStripe409 || isStripeParamMismatch)) {
        console.warn('[create-subscription-intent] idempotency conflict:', stripeErr);
        try {
          const { data: found } = await supabase
            .from('payment_transactions')
            .select('metadata, stripe_payment_intent_id')
            .eq('metadata->>idempotency_key', String(idempotencyKey))
            .limit(1)
            .maybeSingle();

          if (found?.metadata) {
            const existingSubId = found.metadata.stripe_subscription_id as string | undefined;
            const existingPaymentIntentId =
              (found.metadata.payment_intent_id as string | undefined) ??
              (found.stripe_payment_intent_id as string | undefined);

            if (existingSubId) {
              try {
                const existingSub = await stripe.subscriptions.retrieve(existingSubId, {
                  expand: ['latest_invoice.payment_intent'],
                });
                const latestInvoice: any = existingSub.latest_invoice;
                const pi = latestInvoice?.payment_intent;
                return NextResponse.json(
                  { subscriptionId: existingSubId, clientSecret: pi?.client_secret ?? null },
                  { status: 200 }
                );
              } catch (e) {
                console.warn(
                  '[create-subscription-intent] could not retrieve existing subscription after idempotency conflict',
                  e
                );
              }
            } else if (existingPaymentIntentId) {
              try {
                const pi = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
                return NextResponse.json(
                  { subscriptionId: null, clientSecret: pi.client_secret ?? null },
                  { status: 200 }
                );
              } catch (e) {
                console.warn(
                  '[create-subscription-intent] could not retrieve existing payment_intent after idempotency conflict',
                  e
                );
              }
            }
          }
        } catch (lookupErr) {
          console.warn('[create-subscription-intent] error looking up transaction after idempotency conflict', lookupErr);
        }

        return NextResponse.json(
          { error: 'Idempotency key currently in use, intenta de nuevo en unos segundos' },
          { status: 409 }
        );
      }

      if (trackedTxId && (!trackedMetadata?.stripe_subscription_id) && trackedTxStatus === 'processing') {
        try {
          await supabase
            .from('payment_transactions')
            .update({ status: 'failed' })
            .eq('id', trackedTxId);
        } catch (updateErr) {
          console.warn('[create-subscription-intent] could not mark transaction as failed after error', updateErr);
        }
      }

      // Re-throw unknown stripe errors
      throw stripeErr;
    }

    const metadataToStore: Record<string, any> = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      payment_intent_id: paymentIntent?.id ?? null,
      ...(idempotencyKey ? { idempotency_key: String(idempotencyKey) } : {}),
      plan_id: plan.id,
      plan_interval: plan.interval,
      plan_currency: plan.currency,
      plan_price: plan.price,
    };

    // Track transaction in DB
    try {
      const txPayload = {
        user_id: user?.id ?? '',
        raffle_id: null,
        // We store the Stripe subscription id inside metadata. The internal
        // `subscription_id` column references our own `subscriptions` UUID and
        // will be filled by the webhook once the subscription is persisted.
        subscription_id: null,
        payment_method_id: paymentMethodId,
        transaction_type: 'subscription',
        amount: plan.price,
        currency: (plan.currency || 'USD').toUpperCase(),
        status: 'pending',
        stripe_payment_status: paymentIntent?.status ?? 'requires_confirmation',
        stripe_payment_intent_id: paymentIntent?.id ?? null,
        metadata: metadataToStore,
      };

      if (trackedTxId) {
        const { error: updateErr } = await supabase.from('payment_transactions').update(txPayload).eq('id', trackedTxId);
        if (updateErr) {
          console.warn('[create-subscription-intent] could not update tracking transaction', updateErr);
        }
      } else {
        const { error: insertErr } = await supabase.from('payment_transactions').insert(txPayload);
        if (insertErr) {
          console.warn('[create-subscription-intent] could not insert tracking transaction', insertErr);
        }
      }
    } catch (e) {
      console.warn('[create-subscription-intent] persistence error for transaction', e);
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
    });
  } catch (error) {
    console.error('[create-subscription-intent] error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
