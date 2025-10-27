import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '../../../../lib/payments/stripe';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase/service';

export const runtime = 'nodejs';

type FinalizeBody = {
  subscriptionId?: string | null;
  paymentIntentId?: string | null;
  planId?: string | null;
  idempotencyKey?: string | null;
};

function toIso(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body: FinalizeBody = await req.json();
    const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : null;
    const paymentIntentId = body.paymentIntentId ? String(body.paymentIntentId) : null;
    const planIdFromRequest = body.planId ? String(body.planId) : null;
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : null;

    if (!subscriptionId && !paymentIntentId && !idempotencyKey) {
      return NextResponse.json(
        { error: 'subscriptionId, paymentIntentId o idempotencyKey son requeridos' },
        { status: 400 }
      );
    }

    const supabaseClient = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const stripe = getStripeClient();

    let subscription: Stripe.Subscription | null = null;
    let paymentIntent: Stripe.PaymentIntent | null = null;

    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | undefined;
      const invoicePaymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | undefined;
      paymentIntent = invoicePaymentIntent ?? null;
    } else if (paymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['invoice.subscription', 'invoice.customer', 'invoice.lines.data.price.product'],
      });

      const invoice = paymentIntent.invoice as Stripe.Invoice | undefined;
      if (invoice?.subscription) {
        subscription =
          typeof invoice.subscription === 'string'
            ? await stripe.subscriptions.retrieve(invoice.subscription)
            : (invoice.subscription as Stripe.Subscription);
      }
    }

    if (!subscription) {
      return NextResponse.json({ error: 'No se pudo obtener la suscripción desde Stripe' }, { status: 404 });
    }

    const serviceClient = getSupabaseServiceClient();

    const planId =
      planIdFromRequest ??
      (typeof subscription.metadata?.plan_id === 'string' ? subscription.metadata.plan_id : null) ??
      null;

    // Upsert subscription in Supabase
    const { data: existingSub, error: findSubErr } = await serviceClient
      .from('subscriptions')
      .select('id')
      .eq("stripe_raw->>id", subscription.id)
      .maybeSingle();

    if (findSubErr) {
      console.error('[finalize-subscription] could not query subscriptions', findSubErr);
      return NextResponse.json({ error: 'No se pudo registrar la suscripción' }, { status: 500 });
    }

    const subscriptionPayload = {
      user_id: user.id,
      plan_id: planId,
      status: subscription.status ?? 'active',
      current_period_start: toIso(subscription.current_period_start),
      current_period_end: toIso(subscription.current_period_end),
      stripe_raw: subscription as unknown as Record<string, unknown>,
    };

    let internalSubscriptionId: string | null = null;

    if (existingSub?.id) {
      const { data: updated, error: updateErr } = await serviceClient
        .from('subscriptions')
        .update(subscriptionPayload)
        .eq('id', existingSub.id)
        .select('id')
        .single();

      if (updateErr) {
        console.error('[finalize-subscription] error updating subscription', updateErr);
        return NextResponse.json({ error: 'No se pudo actualizar la suscripción' }, { status: 500 });
      }

      internalSubscriptionId = updated.id;
    } else {
      const { data: inserted, error: insertErr } = await serviceClient
        .from('subscriptions')
        .insert(subscriptionPayload)
        .select('id')
        .single();

      if (insertErr) {
        console.error('[finalize-subscription] error inserting subscription', insertErr);
        return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500 });
      }

      internalSubscriptionId = inserted.id;
    }

    if (!internalSubscriptionId) {
      return NextResponse.json({ error: 'No se pudo asignar la suscripción interna' }, { status: 500 });
    }

    // Build filter for corresponding transaction
    const filters: string[] = [];
    if (idempotencyKey) filters.push(`metadata->>idempotency_key.eq.${idempotencyKey}`);
    if (paymentIntent?.id) {
      filters.push(`stripe_payment_intent_id.eq.${paymentIntent.id}`);
      filters.push(`metadata->>payment_intent_id.eq.${paymentIntent.id}`);
    }
    if (subscription.id) {
      filters.push(`metadata->>stripe_subscription_id.eq.${subscription.id}`);
    }

    let txQuery = serviceClient
      .from('payment_transactions')
      .select('id, metadata, status, stripe_payment_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters.length > 0) {
      txQuery = txQuery.or(filters.join(','));
    }

    const { data: transactions, error: txLookupErr } = await txQuery.limit(5);

    const transaction =
      Array.isArray(transactions) && transactions.length > 0
        ? transactions.find((tx) => tx.metadata?.plan_id === planId) ?? transactions[0]
        : null;

    if (txLookupErr) {
      console.error('[finalize-subscription] error fetching payment transaction', txLookupErr);
      return NextResponse.json({ error: 'No se pudo actualizar la transacción' }, { status: 500 });
    }

    if (transaction?.id) {
      const metadata = {
        ...(transaction.metadata ?? {}),
        stripe_subscription_id: subscription.id,
        stripe_customer_id:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : (subscription.customer as Stripe.Customer | null)?.id ?? transaction.metadata?.stripe_customer_id ?? null,
        payment_intent_id: paymentIntent?.id ?? transaction.metadata?.payment_intent_id ?? null,
        plan_id: planId,
        plan_interval: subscription.items?.data?.[0]?.plan?.interval ?? transaction.metadata?.plan_interval ?? null,
        plan_currency:
          subscription.items?.data?.[0]?.plan?.currency?.toUpperCase() ??
          (transaction.metadata?.plan_currency as string | undefined) ??
          null,
      };

      const targetStatus =
        paymentIntent?.status === 'succeeded'
          ? 'completed'
          : transaction.status === 'completed'
            ? 'completed'
            : 'pending';

      const { error: txUpdateErr } = await serviceClient
        .from('payment_transactions')
        .update({
          status: targetStatus,
          stripe_payment_status: paymentIntent?.status ?? transaction.stripe_payment_status ?? 'processing',
          subscription_id: internalSubscriptionId,
          metadata,
        })
        .eq('id', transaction.id);

      if (txUpdateErr) {
        console.error('[finalize-subscription] error updating transaction', txUpdateErr);
        return NextResponse.json({ error: 'No se pudo finalizar la transacción' }, { status: 500 });
      }
    }

    return NextResponse.json({
      subscriptionId: internalSubscriptionId,
      stripeSubscriptionStatus: subscription.status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
  } catch (error) {
    console.error('[finalize-subscription] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
