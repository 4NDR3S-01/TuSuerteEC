'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../../lib/auth/get-user';
import { fetchPaymentMethodById } from '../../../../../lib/payments/server';
import { getStripeClient } from '../../../../../lib/payments/stripe';
import { getAppBaseUrl } from '../../../../../lib/payments/utils';

type ManualTransferPayload = {
  paymentMethodId: string;
  reference?: string;
  notes?: string;
  receiptUrl?: string;
};

type StripeCheckoutPayload = {
  paymentMethodId: string;
};

/**
 * Server Action para comprar un boleto de sorteo
 * Usa la función RPC segura que previene race conditions
 */
export async function purchaseRaffleTicket(raffleId: string) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser();
    if (!user) {
      return { 
        success: false, 
        error: 'Debes iniciar sesión para participar en sorteos' 
      };
    }

    const supabase = await getSupabaseServerClient();

    // Usar función RPC segura con locks atómicos
    const { data, error } = await supabase.rpc('create_raffle_entry_safe', {
      p_raffle_id: raffleId,
      p_user_id: user.id,
      p_entry_source: 'manual_purchase',
      p_subscription_id: null
    });

    if (error) {
      console.error('[purchaseRaffleTicket] Error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    // Revalidar la página del sorteo para mostrar la nueva entrada
    revalidatePath(`/app/sorteos/${raffleId}`);
    revalidatePath('/app');

    return { 
      success: true, 
      entryId: data,
      message: 'Tu entrada ha sido registrada exitosamente' 
    };

  } catch (error) {
    console.error('[purchaseRaffleTicket] Excepción:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al procesar la compra' 
    };
  }
}

/**
 * Crea un registro de pago pendiente para transferencias manuales y pagos QR
 * El administrador podrá validar posteriormente y liberar el boleto
 */
export async function createManualTransferPayment(raffleId: string, payload: ManualTransferPayload) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para continuar',
      };
    }

    const supabase = await getSupabaseServerClient();

    const paymentMethod = await fetchPaymentMethodById(payload.paymentMethodId);
    if (!paymentMethod || !['manual_transfer', 'qr_code'].includes(paymentMethod.type) || !paymentMethod.is_active) {
      return {
        success: false,
        error: 'Método de pago no disponible',
      };
    }

    const config = paymentMethod.config ?? {};
    const manualConfig = config.manual ?? {};
    const qrConfig = config.qr ?? {};
    const currency = config.currency ?? 'USD';

    // Traer información del sorteo incluyendo precio
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, title, status, ticket_price')
      .eq('id', raffleId)
      .maybeSingle();

    if (raffleError || !raffle) {
      return {
        success: false,
        error: 'No se encontró el sorteo seleccionado.',
      };
    }

    // El precio ahora viene del sorteo, no del método de pago
    const amount = raffle.ticket_price || 0;

    if (!amount) {
      return {
        success: false,
        error: 'Este sorteo no tiene un precio configurado.',
      };
    }

    const { error: insertError } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      raffle_id: raffle.id,
      subscription_id: null,
      payment_method_id: paymentMethod.id,
      transaction_type: 'raffle_ticket',
      amount,
      currency,
      status: 'pending',
      receipt_reference: payload.reference || null,
      receipt_url: payload.receiptUrl || null,
      metadata: {
        payment_type: paymentMethod.type,
        payment_method_name: paymentMethod.name,
        notes: payload.notes || null,
        ...(paymentMethod.type === 'manual_transfer' && { manual_config: manualConfig }),
        ...(paymentMethod.type === 'qr_code' && { qr_config: qrConfig }),
        raffle: {
          id: raffle.id,
          title: raffle.title,
        },
        requested_at: new Date().toISOString(),
      },
    });

    if (insertError) {
      console.error('[createManualTransferPayment] error inserting payment:', insertError);
      return {
        success: false,
        error: 'No se pudo registrar la solicitud. Intenta más tarde.',
      };
    }

    revalidatePath('/administrador/pagos');
    revalidatePath(`/app/sorteos/${raffleId}`);

    return {
      success: true,
      message: paymentMethod.type === 'qr_code' 
        ? 'Solicitud registrada. Escanea el código QR y completa el pago.'
        : 'Solicitud registrada. Sigue las instrucciones para completar tu transferencia.',
      instructions: paymentMethod.type === 'manual_transfer' ? manualConfig : qrConfig,
    };
  } catch (error) {
    console.error('[createManualTransferPayment] Excepción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear la solicitud',
    };
  }
}

/**
 * Inicializa un Checkout Session de Stripe para comprar un boleto
 */
export async function createStripeCheckoutSession(raffleId: string, payload: StripeCheckoutPayload) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para continuar',
      };
    }

    const supabase = await getSupabaseServerClient();
    const paymentMethod = await fetchPaymentMethodById(payload.paymentMethodId);
    if (!paymentMethod || paymentMethod.type !== 'stripe' || !paymentMethod.is_active) {
      return {
        success: false,
        error: 'Método de pago no disponible',
      };
    }

    const config = paymentMethod.config ?? {};
    const stripeConfig = config.stripe ?? {};
    const currency = config.currency ?? 'USD';

    // Traer información del sorteo incluyendo precio y stripe_price_id
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, title, status, ticket_price, stripe_price_id')
      .eq('id', raffleId)
      .maybeSingle();

    if (raffleError || !raffle) {
      return {
        success: false,
        error: 'No se encontró el sorteo seleccionado.',
      };
    }

    // El precio ahora viene del sorteo
    const amount = raffle.ticket_price || 0;
    
    if (!raffle.stripe_price_id) {
      return {
        success: false,
        error: 'Este sorteo no está configurado para pagos con Stripe. Contacta al administrador.',
      };
    }

    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl();

    const successPath = stripeConfig.successPath || `/app/sorteos/${raffleId}?payment=success`;
    const cancelPath = stripeConfig.cancelPath || `/app/sorteos/${raffleId}?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: stripeConfig.mode || 'payment',
      line_items: [
        {
          price: raffle.stripe_price_id, // Ahora viene del sorteo
          quantity: 1,
        },
      ],
      metadata: {
        raffle_id: raffle.id,
        payment_method_id: paymentMethod.id,
        user_id: user.id,
      },
      client_reference_id: user.id,
      success_url: `${baseUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      customer_email: user.email ?? undefined,
    });

    const { error: insertError } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      raffle_id: raffle.id,
      subscription_id: null,
      payment_method_id: paymentMethod.id,
      transaction_type: 'raffle_ticket',
      amount,
      currency,
      status: 'pending',
      stripe_payment_intent_id: session.id,
      metadata: {
        checkout_session_id: session.id,
        payment_type: paymentMethod.type,
        payment_method_name: paymentMethod.name,
        raffle: {
          id: raffle.id,
          title: raffle.title,
        },
        requested_at: new Date().toISOString(),
      },
    });

    if (insertError) {
      console.error('[createStripeCheckoutSession] error inserting payment:', insertError);
      return {
        success: false,
        error: 'No se pudo preparar el pago. Intenta más tarde.',
      };
    }

    revalidatePath(`/app/sorteos/${raffleId}`);

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error('[createStripeCheckoutSession] Excepción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear el Checkout',
    };
  }
}

/**
 * Server Action para verificar si el usuario puede participar en un sorteo
 * Verifica límites de entradas y eligibilidad
 */
export async function checkRaffleEligibility(raffleId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { 
        eligible: false, 
        reason: 'not_authenticated' 
      };
    }

    const supabase = await getSupabaseServerClient();

    // Obtener información del sorteo
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, status, entry_mode, max_entries_per_user')
      .eq('id', raffleId)
      .single();

    if (raffleError || !raffle) {
      return { 
        eligible: false, 
        reason: 'raffle_not_found' 
      };
    }

    if (raffle.status !== 'active') {
      return { 
        eligible: false, 
        reason: 'raffle_not_active' 
      };
    }

    // Verificar si el modo de entrada permite compra manual
    if (raffle.entry_mode === 'subscribers_only') {
      // Verificar si tiene suscripción activa
      const now = new Date().toISOString();
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', now)
        .maybeSingle();

      if (!subscription) {
        return { 
          eligible: false, 
          reason: 'subscription_required' 
        };
      }
    }

    // Verificar límite de entradas
    if (raffle.max_entries_per_user) {
      const { count, error: countError } = await supabase
        .from('raffle_entries')
        .select('id', { count: 'exact', head: true })
        .eq('raffle_id', raffleId)
        .eq('user_id', user.id);

      if (countError) {
        console.error('[checkRaffleEligibility] Error al contar entradas:', countError);
        return { 
          eligible: false, 
          reason: 'error_checking_entries' 
        };
      }

      if (count !== null && count >= raffle.max_entries_per_user) {
        return { 
          eligible: false, 
          reason: 'max_entries_reached',
          currentEntries: count,
          maxEntries: raffle.max_entries_per_user
        };
      }

      return {
        eligible: true,
        currentEntries: count || 0,
        maxEntries: raffle.max_entries_per_user
      };
    }

    return { 
      eligible: true,
      currentEntries: 0,
      maxEntries: null
    };

  } catch (error) {
    console.error('[checkRaffleEligibility] Excepción:', error);
    return { 
      eligible: false, 
      reason: 'unknown_error' 
    };
  }
}
