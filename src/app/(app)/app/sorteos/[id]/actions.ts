'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../../lib/auth/get-user';
import { fetchPaymentMethodById } from '../../../../../lib/payments/server';
import { getStripeClient } from '../../../../../lib/payments/stripe';
import { getAppBaseUrl } from '../../../../../lib/payments/utils';

type ManualTransferPayload = {
  paymentMethodId: string;
  reference: string;
  notes?: string;
  receiptUrl?: string;
  amount: number;
  tickets: number;
};

type StripeCheckoutPayload = {
  paymentMethodId: string;
  tickets: number;
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

    const cleanReference = payload.reference.trim();
    if (!cleanReference) {
      return {
        success: false,
        error: 'Debes ingresar el número de comprobante o transacción.',
      };
    }

    const rawAmount = Number(payload.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return {
        success: false,
        error: 'El monto ingresado no es válido.',
      };
    }

    if (!Number.isInteger(payload.tickets) || payload.tickets <= 0) {
      return {
        success: false,
        error: 'El número de boletos calculado no es válido.',
      };
    }

    const cleanNotes = payload.notes?.trim();

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

    const ticketPrice = raffle.ticket_price || 0;

    if (!ticketPrice) {
      return {
        success: false,
        error: 'Este sorteo no tiene un precio configurado.',
      };
    }

    const countDecimals = (value: number) => {
      if (!Number.isFinite(value)) return 0;
      const lower = value.toString().toLowerCase();
      if (lower.includes('e-')) {
        const exponent = Number.parseInt(lower.split('e-')[1] ?? '0', 10);
        return Number.isFinite(exponent) ? exponent : 0;
      }
      const decimals = lower.split('.')[1];
      return decimals ? decimals.length : 0;
    };

    const decimals = Math.min(Math.max(countDecimals(rawAmount), countDecimals(ticketPrice), 2), 6);
    const factor = 10 ** decimals;
    const normalizedAmount = Math.round((rawAmount + Number.EPSILON) * factor);
    const normalizedPrice = Math.round((ticketPrice + Number.EPSILON) * factor);

    if (normalizedPrice <= 0) {
      return {
        success: false,
        error: 'El precio configurado del sorteo no es válido.',
      };
    }

    if (normalizedAmount % normalizedPrice !== 0) {
      return {
        success: false,
        error: 'El monto ingresado no coincide con múltiplos del precio del boleto.',
      };
    }

    const normalizedTickets = normalizedAmount / normalizedPrice;

    if (!Number.isFinite(normalizedTickets) || normalizedTickets <= 0) {
      return {
        success: false,
        error: 'El número de boletos calculado no es válido.',
      };
    }

    if (normalizedTickets !== payload.tickets) {
      return {
        success: false,
        error: 'El monto ingresado no coincide con la cantidad de boletos solicitada.',
      };
    }

    const amount = Number((normalizedAmount / factor).toFixed(decimals));
    const tickets = payload.tickets;

    const { error: insertError } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      raffle_id: raffle.id,
      subscription_id: null,
      payment_method_id: paymentMethod.id,
      transaction_type: 'raffle_ticket',
      amount,
      currency,
      status: 'pending',
      receipt_reference: cleanReference,
      receipt_url: payload.receiptUrl || null,
      metadata: {
        payment_type: paymentMethod.type,
        payment_method_name: paymentMethod.name,
        notes: cleanNotes || null,
        ...(paymentMethod.type === 'manual_transfer' && { manual_config: manualConfig }),
        ...(paymentMethod.type === 'qr_code' && { qr_config: qrConfig }),
        raffle: {
          id: raffle.id,
          title: raffle.title,
        },
        ticket_price: ticketPrice,
        tickets_requested: tickets,
        amount_confirmed: amount,
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
      .select('id, title, status, ticket_price')
      .eq('id', raffleId)
      .maybeSingle();

    if (raffleError || !raffle) {
      return {
        success: false,
        error: 'No se encontró el sorteo seleccionado.',
      };
    }

    const ticketPrice = raffle.ticket_price || 0;

    if (!ticketPrice || ticketPrice <= 0) {
      return {
        success: false,
        error: 'Este sorteo no tiene un precio configurado para pagos con tarjeta.',
      };
    }

    const ticketsRequested = Number.isFinite(payload.tickets) && payload.tickets > 0
      ? Math.floor(payload.tickets)
      : 0;

    if (!ticketsRequested) {
      return {
        success: false,
        error: 'Debes seleccionar al menos un boleto para continuar.',
      };
    }

    const amount = ticketPrice * ticketsRequested;
    const stripeCurrency = (currency || 'USD').toLowerCase();
    const unitAmount = Math.round(ticketPrice * 100);

    if (!unitAmount || unitAmount <= 0) {
      return {
        success: false,
        error: 'El monto configurado para el sorteo no es válido.',
      };
    }

    // No validamos `stripe_price_id` desde el cliente porque la columna fue retirada
    // o puede moverse a la configuración del método de pago. Confiamos en la
    // validación server-side al crear la sesión de Stripe. Aquí no mostramos
    // error por ausencia de price_id para evitar errores de tipado/runtime.

    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl();

    const successPath = stripeConfig.successPath || `/app/sorteos/${raffleId}?payment=success`;
    const cancelPath = stripeConfig.cancelPath || `/app/sorteos/${raffleId}?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: stripeConfig.mode || 'payment',
      line_items: [
        {
          quantity: ticketsRequested,
          price_data: {
            currency: stripeCurrency,
            unit_amount: unitAmount,
            product_data: {
              name: `Boleto ${raffle.title}`,
              metadata: {
                raffle_id: raffle.id,
              },
            },
          },
        },
      ],
      metadata: {
        raffle_id: raffle.id,
        payment_method_id: paymentMethod.id,
        user_id: user.id,
        tickets_requested: ticketsRequested,
      },
      client_reference_id: user.id,
      success_url: `${baseUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      customer_email: user.email ?? undefined,
    });

    const { data: transactionData, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        raffle_id: raffle.id,
        subscription_id: null,
        payment_method_id: paymentMethod.id,
        transaction_type: 'raffle_ticket',
        amount,
        currency,
        status: 'pending',
        stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
        metadata: {
          checkout_session_id: session.id,
          payment_type: paymentMethod.type,
          payment_method_name: paymentMethod.name,
          raffle: {
            id: raffle.id,
            title: raffle.title,
          },
          tickets_requested: ticketsRequested,
          requested_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[createStripeCheckoutSession] error inserting payment:', insertError);
      return {
        success: false,
        error: 'No se pudo preparar el pago. Intenta más tarde.',
      };
    }

    // Actualizar metadata del checkout con el ID de la transacción para rastreo
    if (transactionData?.id) {
      try {
        // Type casting because types for checkout.sessions.update may vary entre versiones
        await (stripe.checkout.sessions as any).update(session.id, {
          metadata: {
            ...(session.metadata || {}),
            transaction_id: transactionData.id,
            tickets_requested: String(ticketsRequested),
          },
        });
      } catch (updateError) {
        console.warn('[createStripeCheckoutSession] Unable to update session metadata:', updateError);
      }
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
 * Crea un PaymentIntent (no redirige) y retorna client_secret para confirmar en el cliente
 */
export async function createStripePaymentIntent(raffleId: string, payload: StripeCheckoutPayload) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para continuar' };
    }

    const supabase = await getSupabaseServerClient();
    const paymentMethod = await fetchPaymentMethodById(payload.paymentMethodId);
    if (!paymentMethod || paymentMethod.type !== 'stripe' || !paymentMethod.is_active) {
      return { success: false, error: 'Método de pago no disponible' };
    }

    const config = paymentMethod.config ?? {};
    const stripeConfig = config.stripe ?? {};
    const currency = (config.currency ?? 'USD').toLowerCase();

    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, title, status, ticket_price')
      .eq('id', raffleId)
      .maybeSingle();

    if (raffleError || !raffle) {
      return { success: false, error: 'No se encontró el sorteo seleccionado.' };
    }

    const ticketPrice = raffle.ticket_price || 0;
    if (!ticketPrice || ticketPrice <= 0) {
      return { success: false, error: 'Este sorteo no tiene un precio configurado para pagos con tarjeta.' };
    }

    const ticketsRequested = Number.isFinite(payload.tickets) && payload.tickets > 0
      ? Math.floor(payload.tickets)
      : 0;

    if (!ticketsRequested) {
      return { success: false, error: 'Debes seleccionar al menos un boleto para continuar.' };
    }

    // Calcular monto en centavos (manejo simple de decimales)
    const unitAmount = Math.round(ticketPrice * 100);
    if (!unitAmount || unitAmount <= 0) {
      return { success: false, error: 'El monto configurado para el sorteo no es válido.' };
    }

    const amount = unitAmount * ticketsRequested;

    const stripe = getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        raffle_id: raffle.id,
        payment_method_id: paymentMethod.id,
        user_id: user.id,
        tickets_requested: String(ticketsRequested),
      },
      receipt_email: user.email ?? undefined,
      // No confirm here; confirm from client with client_secret
      description: `Compra de ${ticketsRequested} boleto(s) - ${raffle.title}`,
    });

    // Registrar transacción pendiente en la BD
    const { data: transactionData, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        raffle_id: raffle.id,
        subscription_id: null,
        payment_method_id: paymentMethod.id,
        transaction_type: 'raffle_ticket',
        amount: Number((amount / 100).toFixed(2)),
        currency: currency.toUpperCase(),
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id ? String(paymentIntent.id) : null,
        metadata: {
          payment_intent_id: paymentIntent.id,
          payment_type: paymentMethod.type,
          payment_method_name: paymentMethod.name,
          raffle: { id: raffle.id, title: raffle.title },
          tickets_requested: ticketsRequested,
          requested_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[createStripePaymentIntent] error inserting payment:', insertError);
      // intentar cancelar el PaymentIntent para evitar intentos huérfanos
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id as string);
      } catch (e) {
        console.warn('[createStripePaymentIntent] could not cancel payment intent', e);
      }
      return { success: false, error: 'No se pudo preparar el pago. Intenta más tarde.' };
    }

    revalidatePath(`/app/sorteos/${raffleId}`);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      transactionId: transactionData?.id ?? null,
    };
  } catch (error) {
    console.error('[createStripePaymentIntent] Excepción:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido al crear PaymentIntent' };
  }
}

/**
 * Finaliza manualmente un PaymentIntent cuando el webhook no llegue oportunamente.
 * Este endpoint es idempotente: si la transacción ya está marcada como 'completed' no creará entradas duplicadas.
 */
export async function finalizeStripePaymentIntent(paymentIntentId: string) {
  try {
    const supabase = await getSupabaseServerClient();

    // Buscar la transacción por stripe_payment_intent_id o en metadata
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('id, user_id, raffle_id, subscription_id, metadata, status, stripe_payment_intent_id')
      .or(`stripe_payment_intent_id.eq.${String(paymentIntentId)},metadata->>payment_intent_id.eq.${String(paymentIntentId)}`)
      .maybeSingle();

    if (fetchError) {
      console.error('[finalizeStripePaymentIntent] error fetching transaction:', fetchError);
      return { success: false, error: 'Error fetching transaction' };
    }

    if (!existingTransaction) {
      console.warn('[finalizeStripePaymentIntent] transaction not found for payment_intent', paymentIntentId);
      return { success: false, error: 'Transaction not found' };
    }

    // If already completed, nothing to do
    if (existingTransaction.status === 'completed') {
      return { success: true, message: 'Already completed' };
    }

    const metadata = existingTransaction.metadata ?? {};
    // Obtener cantidad de boletos solicitados desde metadata (fallback a 1)
    const ticketsRequestedRaw = metadata?.tickets_requested ?? 1;
    const ticketsRequestedNumber = Number(
      typeof ticketsRequestedRaw === 'string' ? parseInt(String(ticketsRequestedRaw), 10) : ticketsRequestedRaw,
    );
    const ticketsRequested = Number.isFinite(ticketsRequestedNumber) && ticketsRequestedNumber > 0 ? Math.floor(ticketsRequestedNumber) : 1;

    const updatedMetadata = {
      ...metadata,
      tickets_requested: ticketsRequested,
      stripe: {
        ...(metadata?.stripe as Record<string, unknown> | undefined),
        payment_intent_id: paymentIntentId,
        completed_at: new Date().toISOString(),
      },
    };

    console.info('[finalizeStripePaymentIntent] finalizing intent', paymentIntentId, 'transaction', existingTransaction.id);

    // Update only if the transaction is still pending. If another process (webhook)
    // already marked it as completed, don't create entries again.
    const { data: updatedRows, error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        stripe_payment_status: 'succeeded',
        stripe_payment_intent_id: String(paymentIntentId),
        metadata: updatedMetadata,
      })
      .eq('id', existingTransaction.id)
      .eq('status', 'pending')
      .select('id');

    if (updateError) {
      console.error('[finalizeStripePaymentIntent] error updating transaction:', updateError);
      return { success: false, error: 'Error updating transaction' };
    }

    const didUpdate = Array.isArray(updatedRows) && updatedRows.length > 0;

    if (!didUpdate) {
      console.info('[finalizeStripePaymentIntent] transaction already finalized by another process, skipping entry creation', existingTransaction.id);
      return { success: true, message: 'Already completed by another process' };
    }

    console.info('[finalizeStripePaymentIntent] transaction updated to completed', existingTransaction.id);

    if (existingTransaction.raffle_id && existingTransaction.user_id) {
      for (let i = 0; i < ticketsRequested; i += 1) {
        const { data: entryCreation, error: entryError } = await supabase.rpc('create_raffle_entry_safe', {
          p_raffle_id: existingTransaction.raffle_id,
          p_user_id: existingTransaction.user_id,
          // Align with existing Checkout source so DB check constraint accepts it
          p_entry_source: 'stripe_checkout',
          p_subscription_id: existingTransaction.subscription_id || null,
        });

        if (entryError) {
          console.error('[finalizeStripePaymentIntent] error creating raffle entry:', entryError);
          break;
        } else {
          console.info('[finalizeStripePaymentIntent] entry created', entryCreation);
        }
      }

      try {
        revalidatePath(`/app/sorteos/${existingTransaction.raffle_id}`);
        revalidatePath('/app');
        revalidatePath('/administrador/pagos');
      } catch (err) {
        console.error('[finalizeStripePaymentIntent] revalidate error:', err);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[finalizeStripePaymentIntent] exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
