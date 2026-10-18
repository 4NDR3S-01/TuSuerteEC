'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../../../../lib/db';
import { getCurrentUser } from '../../../../../lib/auth/get-user';
import { checkRateLimit } from '../../../../../lib/security/rate-limit';
import {
  PaymentRequestError,
  createRafflePaymentRequest,
  loadPurchasableRaffle,
  previewDiscount,
} from '../../../../../lib/payments/requests';
import { fromCents, toCents } from '../../../../../lib/payments/money';

type ManualTransferPayload = {
  paymentMethodId: string;
  reference: string;
  notes?: string;
  receiptUrl?: string;
  tickets: number;
  /** Monto que el usuario vio en pantalla; el servidor lo recalcula y debe coincidir */
  amount?: number;
  discountCode?: string;
};

/**
 * Crea un registro de pago pendiente para transferencias manuales y pagos QR.
 * El monto se calcula en el servidor; el personal verifica el comprobante y libera los boletos.
 */
export async function createManualTransferPayment(raffleId: string, payload: ManualTransferPayload) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión para continuar' };
  }

  if (!checkRateLimit(`payment-request:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Registraste demasiadas solicitudes. Intenta más tarde.' };
  }

  try {
    const result = await createRafflePaymentRequest(user, raffleId, payload);
    const config = result.method.config ?? {};

    revalidatePath('/administrador/pagos/transacciones');
    revalidatePath('/staff/pagos');
    revalidatePath(`/app/sorteos/${raffleId}`);
    revalidatePath('/app/boletos');

    return {
      success: true,
      transactionId: result.transactionId,
      amount: result.amount,
      tickets: result.tickets,
      message: 'Recibimos tu solicitud. Verificaremos el pago y te avisaremos cuando tus boletos estén activos.',
      instructions: result.method.type === 'manual_transfer' ? config.manual ?? {} : config.qr ?? {},
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof PaymentRequestError ? error.message : 'No pudimos registrar tu solicitud. Intenta nuevamente.',
    };
  }
}

/** Calcula el total de una compra de boletos con un código de descuento (sin reservarlo) */
export async function previewRaffleDiscount(raffleId: string, tickets: number, code: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión para continuar' };
  if (!checkRateLimit(`discount-preview:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).allowed) {
    return { success: false, error: 'Demasiados intentos. Espera unos minutos.' };
  }

  try {
    const raffle = await loadPurchasableRaffle(raffleId);
    const count = Number(tickets);
    if (!Number.isInteger(count) || count < 1) return { success: false, error: 'Cantidad de boletos no válida.' };
    const subtotal = fromCents(toCents(raffle.ticket_price) * count);
    const result = await previewDiscount(user, { code, scope: 'raffles', raffleId: raffle.id, subtotal });
    return { success: true, code: result.code, discount: result.discount, total: result.total, subtotal, label: result.label };
  } catch (error) {
    return { success: false, error: error instanceof PaymentRequestError ? error.message : 'No pudimos validar el código.' };
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
      return { eligible: false, reason: 'not_authenticated' };
    }

    const raffle = await prisma.raffles.findUnique({
      where: { id: String(raffleId) },
      select: { id: true, status: true, entry_mode: true, max_entries_per_user: true, end_date: true, start_date: true },
    });

    if (!raffle) {
      return { eligible: false, reason: 'raffle_not_found' };
    }

    const now = new Date();
    if (raffle.status !== 'active' || (raffle.end_date && raffle.end_date <= now) || (raffle.start_date && raffle.start_date > now)) {
      return { eligible: false, reason: 'raffle_not_active' };
    }

    if (raffle.entry_mode === 'subscribers_only') {
      return { eligible: false, reason: 'subscription_required' };
    }

    if (raffle.max_entries_per_user) {
      const [count, pending] = await Promise.all([
        prisma.raffle_entries.count({ where: { raffle_id: raffle.id, user_id: user.id } }),
        prisma.payment_transactions.findMany({
          where: { raffle_id: raffle.id, user_id: user.id, status: 'pending', transaction_type: 'raffle_ticket' },
          select: { metadata: true },
        }),
      ]);
      const pendingTickets = pending.reduce((sum, row) => sum + (Number((row.metadata as { tickets_requested?: number } | null)?.tickets_requested) || 1), 0);

      if (count + pendingTickets >= raffle.max_entries_per_user) {
        return {
          eligible: false,
          reason: 'max_entries_reached',
          currentEntries: count,
          pendingTickets,
          maxEntries: raffle.max_entries_per_user,
        };
      }

      return { eligible: true, currentEntries: count, pendingTickets, maxEntries: raffle.max_entries_per_user };
    }

    return { eligible: true, currentEntries: 0, pendingTickets: 0, maxEntries: null };
  } catch (error) {
    console.error('[checkRaffleEligibility] Excepción:', error);
    return { eligible: false, reason: 'unknown_error' };
  }
}

/** Cantidad de participantes únicos de un sorteo */
export async function getRaffleUniqueParticipantsCount(raffleId: string) {
  const rows = await prisma.raffle_entries.groupBy({ by: ['user_id'], where: { raffle_id: String(raffleId) } });
  return rows.length;
}
