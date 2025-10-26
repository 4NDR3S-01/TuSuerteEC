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

  // ✅ BUSCAR EN payment_transactions (nueva tabla)
  const { data: existingTransaction, error: fetchError } = await supabase
    .from('payment_transactions')
    .select('id, user_id, raffle_id, subscription_id, metadata, status')
    .eq('stripe_payment_intent_id', session.payment_intent as string)
    .maybeSingle();

  if (fetchError) {
    console.error('[stripe-webhook] error fetching transaction:', fetchError);
    return;
  }

  if (!existingTransaction) {
    console.warn('[stripe-webhook] transaction not found for payment_intent', session.payment_intent);
    return;
  }

  const metadata = existingTransaction?.metadata ?? {};
  const updatedMetadata = {
    ...metadata,
    stripe: {
      ...(metadata?.stripe as Record<string, unknown> | undefined),
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent,
      event_id: event.id,
      completed_at: new Date().toISOString(),
    },
  };

  // ✅ ACTUALIZAR estado a completed
  if (existingTransaction.status !== 'completed') {
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({ 
        status: 'completed',
        stripe_payment_status: 'succeeded',
        metadata: updatedMetadata 
      })
      .eq('id', existingTransaction.id);

    if (updateError) {
      console.error('[stripe-webhook] error updating transaction:', updateError);
      return;
    }
  }

  // ✅ CREAR ENTRADA DE SORTEO si es para un sorteo
  if (existingTransaction.raffle_id && existingTransaction.user_id) {
    const { data: entryCreation, error: entryError } = await supabase.rpc('create_raffle_entry_safe', {
      p_raffle_id: existingTransaction.raffle_id,
      p_user_id: existingTransaction.user_id,
      p_entry_source: 'stripe_checkout',
      p_subscription_id: existingTransaction.subscription_id || null,
    });

    if (entryError) {
      console.error('[stripe-webhook] error creating raffle entry:', entryError);
    } else {
      console.info('[stripe-webhook] entry created', entryCreation);
    }

    // Revalidar vistas relevantes
    try {
      revalidatePath(`/app/sorteos/${existingTransaction.raffle_id}`);
      revalidatePath('/app');
      revalidatePath('/administrador/pagos');
    } catch (err) {
      console.error('[stripe-webhook] revalidate error:', err);
    }
  }
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      stripe_payment_status: 'canceled',
      metadata: {
        expired_at: new Date().toISOString(),
        checkout_session_id: session.id,
        event_id: event.id,
      },
    })
    .eq('stripe_payment_intent_id', session.payment_intent as string);

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
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe-webhook] handler error', error);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

