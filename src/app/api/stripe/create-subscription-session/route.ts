import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '../../../../lib/payments/stripe';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getAppBaseUrl } from '../../../../lib/payments/utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Server-side: get current user and plan details
    const supabase = await getSupabaseServerClient();

    // NOTE: we expect the client to be authenticated and send a cookie/session
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, price, currency, interval, description')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      console.error('[create-subscription-session] plan not found', planError);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl();

    // Create a Checkout Session in subscription mode using price_data inline (no pre-created Price ID required)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: (plan.currency || 'USD').toLowerCase(),
            product_data: {
              name: plan.name,
              description: plan.description ?? undefined,
              metadata: { plan_id: plan.id },
            },
            recurring: { interval: plan.interval === 'year' ? 'year' : 'month' },
            unit_amount: Math.round((plan.price || 0) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        plan_id: plan.id,
      },
      success_url: `${baseUrl}/app/planes?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/app/planes?payment=cancelled`,
      // collect shipping or customer info as needed
    });

    // Insert a pending transaction to track this subscription purchase
    try {
      // Avoid duplicate records if the session was already recorded
      const existing = await supabase
        .from('payment_transactions')
        .select('id')
        .eq("metadata->>checkout_session_id", session.id)
        .limit(1)
        .maybeSingle();

      if (!existing.data) {
        await supabase.from('payment_transactions').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id ?? '',
          raffle_id: null,
          subscription_id: null,
          payment_method_id: 'stripe',
          transaction_type: 'subscription',
          amount: plan.price,
          currency: (plan.currency || 'USD').toUpperCase(),
          status: 'pending',
          metadata: {
            checkout_session_id: session.id,
            plan_id: plan.id,
            requested_at: new Date().toISOString(),
          },
        });
      } else {
        console.info('[create-subscription-session] existing transaction found for session, skipping insert', existing.data.id);
      }
    } catch (e) {
      console.warn('[create-subscription-session] could not insert tracking transaction', e);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[create-subscription-session] error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
