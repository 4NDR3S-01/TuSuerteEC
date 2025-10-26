/**
 * Helper para crear transacciones de pago en el sistema
 * Este módulo centraliza la lógica de creación de payment_transactions
 */

import { getSupabaseBrowserClient } from '../supabase/client';

export type CreateTransactionParams = {
  userId: string;
  paymentMethodId: string;
  transactionType: 'raffle_ticket' | 'subscription' | 'other';
  amount: number;
  currency?: string;
  raffleId?: string;
  subscriptionId?: string;
  stripePaymentIntentId?: string;
  receiptReference?: string;
  metadata?: Record<string, any>;
};

export type PaymentTransactionResult = {
  id: string;
  user_id: string;
  payment_method_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  raffle_id: string | null;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  receipt_reference: string | null;
  status: string;
  metadata: any;
  created_at: string;
};

/**
 * Crea una nueva transacción de pago en la base de datos
 * 
 * @example
 * // Para un boleto de sorteo con Stripe
 * const transaction = await createPaymentTransaction({
 *   userId: user.id,
 *   paymentMethodId: stripeCardMethod.id,
 *   transactionType: 'raffle_ticket',
 *   amount: 19.99,
 *   raffleId: raffle.id,
 *   stripePaymentIntentId: paymentIntent.id
 * });
 * 
 * @example
 * // Para transferencia bancaria manual
 * const transaction = await createPaymentTransaction({
 *   userId: user.id,
 *   paymentMethodId: manualTransferMethod.id,
 *   transactionType: 'raffle_ticket',
 *   amount: 19.99,
 *   raffleId: raffle.id,
 *   receiptReference: 'SORTEO-123-USER-456-1234567890'
 * });
 */
export async function createPaymentTransaction(
  params: CreateTransactionParams
): Promise<PaymentTransactionResult> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: params.userId,
      payment_method_id: params.paymentMethodId,
      transaction_type: params.transactionType,
      amount: params.amount,
      currency: params.currency || 'USD',
      raffle_id: params.raffleId || null,
      subscription_id: params.subscriptionId || null,
      stripe_payment_intent_id: params.stripePaymentIntentId || null,
      receipt_reference: params.receiptReference || null,
      status: 'pending',
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[payments] create transaction error:', error);
    throw new Error(`Error al crear la transacción: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene una transacción por su ID con información relacionada
 */
export async function getPaymentTransaction(transactionId: string) {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      profiles:user_id (id, full_name, email, id_number),
      payment_methods:payment_method_id (id, name, type, config),
      raffles:raffle_id (id, title, prize_description),
      subscriptions:subscription_id (id, plan_id, plans (name))
    `)
    .eq('id', transactionId)
    .single();

  if (error) {
    console.error('[payments] get transaction error:', error);
    throw new Error(`Error al obtener la transacción: ${error.message}`);
  }

  return data;
}

/**
 * Actualiza el estado de una transacción
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed',
  metadata?: {
    adminComment?: string;
    rejectionReason?: string;
    reviewedBy?: string;
  }
) {
  const supabase = getSupabaseBrowserClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (metadata?.adminComment) {
    updateData.admin_comment = metadata.adminComment;
  }

  if (metadata?.rejectionReason) {
    updateData.rejection_reason = metadata.rejectionReason;
  }

  if (metadata?.reviewedBy) {
    updateData.reviewed_by = metadata.reviewedBy;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('payment_transactions')
    .update(updateData)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    console.error('[payments] update status error:', error);
    throw new Error(`Error al actualizar la transacción: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene transacciones pendientes de revisión (solo transferencias manuales)
 */
export async function getPendingManualTransactions() {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      profiles:user_id (full_name, email, id_number),
      payment_methods:payment_method_id (name, type),
      raffles:raffle_id (title)
    `)
    .eq('status', 'pending')
    .in('payment_methods.type', ['manual_transfer'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[payments] get pending transactions error:', error);
    throw new Error(`Error al obtener transacciones pendientes: ${error.message}`);
  }

  return data || [];
}
