import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '../../../../lib/payments/stripe';
import { getSupabaseServiceClient } from '../../../../lib/supabase/service';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const stripe = getStripeClient();

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== 'paid') {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const transactionId = (session.metadata?.transaction_id as string | undefined) ?? null;

  let existingTransaction: {
    id: string;
    user_id: string | null;
    raffle_id: string | null;
    subscription_id: string | null;
    metadata: Record<string, unknown> | null;
    status: string;
    stripe_payment_intent_id: string | null;
  } | null = null;

  if (transactionId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('id, user_id, raffle_id, subscription_id, metadata, status, stripe_payment_intent_id')
      .eq('id', transactionId)
      .maybeSingle();

    if (error) {
      console.error('[stripe-webhook] error fetching transaction by id:', error);
      return;
    }
    existingTransaction = data;
  } else {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('id, user_id, raffle_id, subscription_id, metadata, status, stripe_payment_intent_id')
      .eq('metadata->>checkout_session_id', session.id)
      .maybeSingle();

    if (error) {
      console.error('[stripe-webhook] error fetching transaction by session id:', error);
      return;
    }
    existingTransaction = data;
  }

  if (!existingTransaction) {
    console.warn('[stripe-webhook] transaction not found for checkout session', session.id);
    return;
  }

  const metadata = existingTransaction.metadata ?? {};
  const ticketsRequestedRaw =
    (metadata?.tickets_requested as number | string | null | undefined) ??
    (session.metadata?.tickets_requested as string | number | undefined) ??
    1;
  const ticketsRequestedNumber = Number(
    typeof ticketsRequestedRaw === 'string' ? parseInt(ticketsRequestedRaw, 10) : ticketsRequestedRaw,
  );
  const ticketsRequested =
    Number.isFinite(ticketsRequestedNumber) && ticketsRequestedNumber > 0
      ? Math.floor(ticketsRequestedNumber)
      : 1;

  const updatedMetadata = {
    ...metadata,
    tickets_requested: ticketsRequested,
    stripe: {
      ...(metadata?.stripe as Record<string, unknown> | undefined),
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent,
      event_id: event.id,
      completed_at: new Date().toISOString(),
    },
  };

  // Intentar actualizar el estado sólo si aún está 'pending'. Esto evita condiciones de
  // carrera donde tanto el finalizador del cliente como el webhook intentan crear entradas.
  const { data: updatedRows, error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      stripe_payment_status: 'succeeded',
      stripe_payment_intent_id: session.payment_intent
        ? String(session.payment_intent)
        : existingTransaction.stripe_payment_intent_id,
      metadata: updatedMetadata,
    })
    .eq('id', existingTransaction.id)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    console.error('[stripe-webhook] error updating transaction:', updateError);
    return;
  }

  // Si no se actualizó ninguna fila, significa que otra ejecución ya marcó la transacción
  // como 'completed' y por tanto no debemos crear entradas de nuevo.
  const didUpdate = Array.isArray(updatedRows) && updatedRows.length > 0;

  if (didUpdate && existingTransaction.raffle_id && existingTransaction.user_id) {
    for (let i = 0; i < ticketsRequested; i += 1) {
      const { data: entryCreation, error: entryError } = await supabase.rpc('create_raffle_entry_safe', {
        p_raffle_id: existingTransaction.raffle_id,
        p_user_id: existingTransaction.user_id,
        p_entry_source: 'stripe_checkout',
        p_subscription_id: existingTransaction.subscription_id || null,
      });

      if (entryError) {
        console.error('[stripe-webhook] error creating raffle entry:', entryError);
        break;
      } else {
        console.info('[stripe-webhook] entry created', entryCreation);
      }
    }

    try {
      revalidatePath(`/app/sorteos/${existingTransaction.raffle_id}`);
      revalidatePath('/app');
      revalidatePath('/administrador/pagos');
    } catch (err) {
      console.error('[stripe-webhook] revalidate error:', err);
    }
  } else if (!didUpdate) {
    console.info('[stripe-webhook] transaction already finalized by another process, skipping entry creation', existingTransaction.id);
  }

  // If this checkout created a subscription, record it in our subscriptions table
  try {
    if (session.mode === 'subscription' && session.subscription) {
      // Pull subscription details from Stripe
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));

      // Persist subscription in our DB. We don't store the Stripe subscription id
      // as the PK (our `subscriptions.id` is a UUID). Instead we search for an
      // existing row that contains this Stripe id in `stripe_raw->>id`. If none
      // exists we insert a new subscription row and then link the transaction to
      // that internal subscription id.
      try {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq("stripe_raw->>id", String(sub.id))
          .maybeSingle();

        let internalSubId: string | null = null;

        if (existingSub && existingSub.id) {
          // Update existing
          const { data: updated, error: updateErr } = await supabase
            .from('subscriptions')
            .update({
              user_id: existingTransaction.user_id,
              plan_id: session.metadata?.plan_id ?? null,
              status: sub.status ?? 'active',
              current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
              current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              stripe_raw: sub,
            })
            .eq('id', existingSub.id)
            .select('id')
            .single();

          if (updateErr) {
            console.error('[stripe-webhook] error updating existing subscription record:', updateErr);
          } else {
            internalSubId = updated.id;
            console.info('[stripe-webhook] subscription updated', updated);
          }
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('subscriptions')
            .insert({
              user_id: existingTransaction.user_id,
              plan_id: session.metadata?.plan_id ?? null,
              status: sub.status ?? 'active',
              current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
              current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              stripe_raw: sub,
            })
            .select('id')
            .single();

          if (insertErr) {
            console.error('[stripe-webhook] error inserting subscription record:', insertErr);
          } else {
            internalSubId = inserted.id;
            console.info('[stripe-webhook] subscription inserted', inserted);
          }
        }

        // Link the payment transaction to our internal subscription id (if available)
        if (internalSubId) {
          const { error: txErr } = await supabase
            .from('payment_transactions')
            .update({ subscription_id: internalSubId })
            .eq('id', existingTransaction.id);

          if (txErr) console.error('[stripe-webhook] error linking transaction to subscription:', txErr);

          // Ensure this user has only one active subscription: mark others as canceled
          try {
            const { error: cancelErr } = await supabase
              .from('subscriptions')
              .update({ status: 'canceled' })
              .neq('id', internalSubId)
              .eq('user_id', existingTransaction.user_id)
              .eq('status', 'active');

            if (cancelErr) console.error('[stripe-webhook] error canceling other subscriptions for user:', cancelErr);
          } catch (e) {
            console.error('[stripe-webhook] exception canceling other subscriptions:', e);
          }
        }
      } catch (e) {
        console.error('[stripe-webhook] error upserting/inserting subscription record:', e);
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] error handling subscription creation from checkout session:', err);
  }
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const supabase = getSupabaseServiceClient();

  // Buscar transacción por stripe_payment_intent_id
  const { data: existingTransaction, error } = await supabase
    .from('payment_transactions')
    .select('id, user_id, raffle_id, subscription_id, metadata, status, stripe_payment_intent_id')
    .or(`stripe_payment_intent_id.eq.${String(paymentIntent.id)},metadata->>payment_intent_id.eq.${String(paymentIntent.id)}`)
    .maybeSingle();

  if (error) {
    console.error('[stripe-webhook] error fetching transaction for payment_intent:', error);
    return;
  }

  if (!existingTransaction) {
    console.warn('[stripe-webhook] transaction not found for payment_intent', paymentIntent.id);
    return;
  }

  const metadata = existingTransaction.metadata ?? {};
  const ticketsRequestedRaw =
    (metadata?.tickets_requested as number | string | null | undefined) ??
    (paymentIntent.metadata?.tickets_requested as string | number | undefined) ??
    1;
  const ticketsRequestedNumber = Number(
    typeof ticketsRequestedRaw === 'string' ? parseInt(ticketsRequestedRaw, 10) : ticketsRequestedRaw,
  );
  const ticketsRequested =
    Number.isFinite(ticketsRequestedNumber) && ticketsRequestedNumber > 0
      ? Math.floor(ticketsRequestedNumber)
      : 1;

  const updatedMetadata = {
    ...metadata,
    tickets_requested: ticketsRequested,
    stripe: {
      ...(metadata?.stripe as Record<string, unknown> | undefined),
      payment_intent_id: paymentIntent.id,
      event_id: event.id,
      completed_at: new Date().toISOString(),
    },
  };

  // Try to mark the transaction completed only if it's still pending. This prevents duplicate
  // raffle entry creation when multiple processors (client finalizer vs webhook) run concurrently.
  const { data: updatedRows, error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      stripe_payment_status: 'succeeded',
      stripe_payment_intent_id: paymentIntent.id ? String(paymentIntent.id) : existingTransaction.stripe_payment_intent_id,
      metadata: updatedMetadata,
    })
    .eq('id', existingTransaction.id)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    console.error('[stripe-webhook] error updating transaction for payment_intent:', updateError);
    return;
  }

  const didUpdate = Array.isArray(updatedRows) && updatedRows.length > 0;

  if (didUpdate && existingTransaction.raffle_id && existingTransaction.user_id) {
    for (let i = 0; i < ticketsRequested; i += 1) {
      const { data: entryCreation, error: entryError } = await supabase.rpc('create_raffle_entry_safe', {
        p_raffle_id: existingTransaction.raffle_id,
        p_user_id: existingTransaction.user_id,
        // Use the checkout canonical source so it matches DB constraints
        p_entry_source: 'stripe_checkout',
        p_subscription_id: existingTransaction.subscription_id || null,
      });

      if (entryError) {
        console.error('[stripe-webhook] error creating raffle entry for payment_intent:', entryError);
        break;
      } else {
        console.info('[stripe-webhook] entry created', entryCreation);
      }
    }

    try {
      revalidatePath(`/app/sorteos/${existingTransaction.raffle_id}`);
      revalidatePath('/app');
      revalidatePath('/administrador/pagos');
    } catch (err) {
      console.error('[stripe-webhook] revalidate error:', err);
    }
  } else if (!didUpdate) {
    console.info('[stripe-webhook] transaction already finalized by another process, skipping entry creation', existingTransaction.id);
  }

  // If this payment intent relates to a subscription invoice, ensure we upsert the
  // subscription record in our DB (this covers the create-subscription-intent flow
  // where we create a subscription server-side and the client confirms the PI).
  try {
    if (paymentIntent.invoice) {
      // Retrieve the invoice and expand the subscription object
      const invoice = await stripe.invoices.retrieve(String(paymentIntent.invoice), { expand: ['subscription'] });
      const sub = invoice.subscription as Stripe.Subscription | null;

      if (sub && existingTransaction) {
        try {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq("stripe_raw->>id", String(sub.id))
            .maybeSingle();

          let internalSubId: string | null = null;

          if (existingSub && existingSub.id) {
            const { data: updated, error: updateErr } = await supabase
              .from('subscriptions')
              .update({
                user_id: existingTransaction.user_id,
                plan_id: (sub?.metadata && (sub.metadata.plan_id as string)) || existingTransaction.metadata?.plan_id || null,
                status: sub.status ?? 'active',
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                stripe_raw: sub,
              })
              .eq('id', existingSub.id)
              .select('id')
              .single();

            if (updateErr) {
              console.error('[stripe-webhook] error updating existing subscription record from payment_intent:', updateErr);
            } else {
              internalSubId = updated.id;
              console.info('[stripe-webhook] subscription updated from payment_intent', updated);
            }
          } else {
            const { data: inserted, error: insertErr } = await supabase
              .from('subscriptions')
              .insert({
                user_id: existingTransaction.user_id,
                plan_id: (sub?.metadata && (sub.metadata.plan_id as string)) || existingTransaction.metadata?.plan_id || null,
                status: sub.status ?? 'active',
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                stripe_raw: sub,
              })
              .select('id')
              .single();

            if (insertErr) {
              console.error('[stripe-webhook] error inserting subscription record from payment_intent:', insertErr);
            } else {
              internalSubId = inserted.id;
              console.info('[stripe-webhook] subscription inserted from payment_intent', inserted);
            }
          }

          if (internalSubId) {
            const { error: txErr } = await supabase
              .from('payment_transactions')
              .update({ subscription_id: internalSubId })
              .eq('id', existingTransaction.id);

            if (txErr) console.error('[stripe-webhook] error updating transaction with internal subscription id:', txErr);
          }
        } catch (e) {
          console.error('[stripe-webhook] error handling subscription upsert from payment_intent:', e);
        }
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] error handling subscription upsert from payment_intent:', err);
  }
}

async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const supabase = getSupabaseServiceClient();

  const { data: existingTransaction, error } = await supabase
    .from('payment_transactions')
    .select('id, metadata')
    .or(`stripe_payment_intent_id.eq.${String(paymentIntent.id)},metadata->>payment_intent_id.eq.${String(paymentIntent.id)}`)
    .maybeSingle();

  if (error) {
    console.error('[stripe-webhook] error fetching transaction for failed payment_intent:', error);
    return;
  }

  if (!existingTransaction) {
    console.warn('[stripe-webhook] transaction not found for failed payment_intent', paymentIntent.id);
    return;
  }

  const metadata = existingTransaction.metadata ?? {};
  const updatedMetadata = {
    ...metadata,
    stripe: {
      ...(metadata?.stripe as Record<string, unknown> | undefined),
      payment_intent_id: paymentIntent.id,
      event_id: event.id,
      failed_at: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      stripe_payment_status: 'failed',
      metadata: updatedMetadata,
    })
    .eq('id', existingTransaction.id);

  if (updateError) {
    console.error('[stripe-webhook] error marking transaction as failed for payment_intent:', updateError);
  }
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = getSupabaseServiceClient();

  const transactionId = (session.metadata?.transaction_id as string | undefined) ?? null;

  let existingTransaction: { id: string; metadata: Record<string, unknown> | null } | null = null;

  if (transactionId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('id, metadata')
      .eq('id', transactionId)
      .maybeSingle();

    if (error) {
      console.error('[stripe-webhook] error fetching transaction for expired event:', error);
      return;
    }
    existingTransaction = data;
  } else {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('id, metadata')
      .eq('metadata->>checkout_session_id', session.id)
      .maybeSingle();

    if (error) {
      console.error('[stripe-webhook] error fetching transaction by session id for expired event:', error);
      return;
    }
    existingTransaction = data;
  }

  if (!existingTransaction) {
    console.warn('[stripe-webhook] transaction not found for expired session', session.id);
    return;
  }

  const metadata = existingTransaction.metadata ?? {};
  const updatedMetadata = {
    ...metadata,
    stripe: {
      ...(metadata?.stripe as Record<string, unknown> | undefined),
      checkout_session_id: session.id,
      event_id: event.id,
      expired_at: new Date().toISOString(),
    },
  };

  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      stripe_payment_status: 'canceled',
      metadata: updatedMetadata,
    })
    .eq('id', existingTransaction.id);

  if (error) {
    console.error('[stripe-webhook] error marking transaction as failed:', error);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('[stripe-webhook] Missing signature or webhook secret');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const payload = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    console.info('[stripe-webhook] received event', event.type, event.id);
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await handleCheckoutExpired(event);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        // mark as failed if needed
        await handlePaymentIntentFailed(event);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe-webhook] handler error', error);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
