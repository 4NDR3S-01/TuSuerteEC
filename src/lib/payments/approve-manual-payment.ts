/**
 * Helper para aprobar pagos manuales (transferencias bancarias)
 * Este módulo maneja todo el flujo de aprobación de pagos manuales
 */

import { getSupabaseBrowserClient } from '../supabase/client';

export type ApprovePaymentParams = {
  transactionId: string;
  adminComment?: string;
};

export type RejectPaymentParams = {
  transactionId: string;
  rejectionReason: string;
  adminComment?: string;
};

/**
 * Aprueba un pago manual y crea la entrada del sorteo correspondiente
 * 
 * @example
 * const result = await approveManualPayment({
 *   transactionId: 'abc-123',
 *   adminComment: 'Comprobante verificado correctamente'
 * });
 */
export async function approveManualPayment(params: ApprovePaymentParams) {
  const supabase = getSupabaseBrowserClient();

  // 1. Obtener transacción completa
  const { data: transaction, error: fetchError } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      payment_methods:payment_method_id (type)
    `)
    .eq('id', params.transactionId)
    .single();

  if (fetchError || !transaction) {
    throw new Error('Transacción no encontrada');
  }

  // 2. Verificar que es transferencia manual o QR
  if (!['manual_transfer', 'qr_code'].includes(transaction.payment_methods?.type || '')) {
    throw new Error('Esta transacción no es una transferencia manual o pago QR');
  }

  // 3. Verificar que está pendiente
  if (transaction.status !== 'pending') {
    throw new Error(`La transacción ya fue procesada (estado: ${transaction.status})`);
  }

  // 4. Obtener usuario actual (admin)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // 5. Actualizar transacción a approved
  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_comment: params.adminComment || null,
    })
    .eq('id', params.transactionId);

  if (updateError) {
    console.error('[payments] error updating transaction:', updateError);
    throw new Error(`Error al aprobar el pago: ${updateError.message}`);
  }

  // 6. Crear entrada(s) de sorteo si aplica
  if (transaction.raffle_id && transaction.user_id) {
    const ticketsRequestedRaw =
      (transaction.metadata?.tickets_requested as number | string | null | undefined) ?? 1;
    const ticketsRequestedNumber = Number(ticketsRequestedRaw);
    const ticketsToCreate = Number.isFinite(ticketsRequestedNumber)
      ? Math.max(1, Math.floor(ticketsRequestedNumber))
      : 1;

    const createdEntries: unknown[] = [];

    try {
      for (let i = 0; i < ticketsToCreate; i += 1) {
        const { data: entryResult, error: entryError } = await supabase.rpc('create_raffle_entry_safe', {
          p_raffle_id: transaction.raffle_id,
          p_user_id: transaction.user_id,
          p_entry_source: 'manual_purchase',
          p_subscription_id: transaction.subscription_id || null,
        });

        if (entryError) {
          throw entryError;
        }

        createdEntries.push(entryResult);
      }
    } catch (entryError) {
      console.error('[payments] error creating raffle entry:', entryError);

      // Revertir aprobación si falla la creación de los boletos
      await supabase
        .from('payment_transactions')
        .update({
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          admin_comment: `Error al crear boleto: ${
            entryError instanceof Error ? entryError.message : 'desconocido'
          }`,
        })
        .eq('id', params.transactionId);

      throw new Error(
        `Error al crear los boletos del sorteo: ${
          entryError instanceof Error ? entryError.message : 'desconocido'
        }`,
      );
    }

    return {
      success: true,
      message:
        ticketsToCreate === 1
          ? 'Pago aprobado y boleto creado exitosamente'
          : `Pago aprobado y ${ticketsToCreate} boletos creados exitosamente`,
      entryId: createdEntries,
    };
  }

  // Si es una suscripción, solo aprobar el pago
  return {
    success: true,
    message: 'Pago aprobado exitosamente',
  };
}

/**
 * Rechaza un pago manual con un motivo específico
 * 
 * @example
 * await rejectManualPayment({
 *   transactionId: 'abc-123',
 *   rejectionReason: 'Comprobante no válido',
 *   adminComment: 'El número de referencia no coincide'
 * });
 */
export async function rejectManualPayment(params: RejectPaymentParams) {
  const supabase = getSupabaseBrowserClient();

  // 1. Obtener transacción
  const { data: transaction, error: fetchError } = await supabase
    .from('payment_transactions')
    .select('*, payment_methods:payment_method_id (type)')
    .eq('id', params.transactionId)
    .single();

  if (fetchError || !transaction) {
    throw new Error('Transacción no encontrada');
  }

  // 2. Verificar que es transferencia manual o QR
  if (!['manual_transfer', 'qr_code'].includes(transaction.payment_methods?.type || '')) {
    throw new Error('Esta transacción no es una transferencia manual o pago QR');
  }

  // 3. Verificar que está pendiente
  if (transaction.status !== 'pending') {
    throw new Error(`La transacción ya fue procesada (estado: ${transaction.status})`);
  }

  // 4. Obtener usuario actual (admin)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // 5. Actualizar transacción a rejected
  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: params.rejectionReason,
      admin_comment: params.adminComment || null,
    })
    .eq('id', params.transactionId);

  if (updateError) {
    console.error('[payments] error rejecting transaction:', updateError);
    throw new Error(`Error al rechazar el pago: ${updateError.message}`);
  }

  return {
    success: true,
    message: 'Pago rechazado',
  };
}

/**
 * Obtiene el historial de revisiones de una transacción
 */
export async function getTransactionReviewHistory(transactionId: string) {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      id,
      status,
      reviewed_by,
      reviewed_at,
      admin_comment,
      rejection_reason,
      profiles:reviewed_by (full_name, email)
    `)
    .eq('id', transactionId)
    .single();

  if (error) {
    console.error('[payments] error getting review history:', error);
    throw new Error(`Error al obtener historial: ${error.message}`);
  }

  return data;
}

/**
 * Verifica si un usuario tiene permisos para revisar pagos
 */
export async function canReviewPayments(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return ['admin', 'staff'].includes(data.role);
}
