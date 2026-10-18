'use server';

/**
 * Aprobación y rechazo de pagos manuales (transferencias y QR) por parte del personal autorizado.
 * Toda la operación ocurre en una transacción: el pago solo cambia de estado si sigue pendiente,
 * lo que impide aprobarlo dos veces aunque dos personas lo revisen al mismo tiempo.
 */

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AuthorizationError, requirePermission, type User } from '../auth/get-user';
import { recordAudit } from '../audit';
import { createRaffleEntries, enrollSubscriptionInActiveRaffles } from '../raffle/entries';
import { grantReferralRewardIfEligible } from '../marketing/referrals';
import { MANUAL_PAYMENT_TYPES } from './types';

export type ApprovePaymentParams = {
  transactionId: string;
  adminComment?: string;
};

export type RejectPaymentParams = {
  transactionId: string;
  rejectionReason: string;
  adminComment?: string;
};

// Forma plana (sin unión discriminada) porque el proyecto compila con `strict: false`
type ReviewResult = { success: boolean; message?: string; error?: string };

class ReviewError extends Error {}

type Tx = Prisma.TransactionClient;

function addInterval(start: Date, interval: string) {
  const end = new Date(start);
  if (interval === 'year') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

function cleanComment(value: string | undefined) {
  const text = String(value ?? '').trim();
  if (text.length > 500) throw new ReviewError('El comentario supera los 500 caracteres.');
  return text || null;
}

/** Bloquea el pago y valida que se pueda revisar (pendiente, manual y de otra persona) */
async function lockPendingTransaction(tx: Tx, transactionId: string, reviewer: User) {
  const [locked] = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM payment_transactions WHERE id = ${String(transactionId)}::uuid FOR UPDATE
  `;
  if (!locked) throw new ReviewError('Transacción no encontrada');

  const transaction = await tx.payment_transactions.findUniqueOrThrow({
    where: { id: locked.id },
    include: { payment_methods: { select: { type: true } } },
  });

  if (!MANUAL_PAYMENT_TYPES.includes(transaction.payment_methods?.type ?? '')) {
    throw new ReviewError('Esta transacción no es una transferencia manual o pago QR');
  }
  if (transaction.status !== 'pending') {
    throw new ReviewError(`La transacción ya fue procesada (estado: ${transaction.status})`);
  }
  // Separación de funciones: nadie aprueba ni rechaza sus propios pagos
  if (transaction.user_id === reviewer.id) {
    throw new ReviewError('No puedes revisar un pago propio. Pide a otra persona del equipo que lo haga.');
  }

  return transaction;
}

function revalidatePayments(raffleId?: string | null) {
  revalidatePath('/administrador/pagos/transacciones');
  revalidatePath('/staff/pagos');
  revalidatePath('/app');
  revalidatePath('/app/boletos');
  if (raffleId) revalidatePath(`/app/sorteos/${raffleId}`);
}

async function toReviewResult(fn: (reviewer: User) => Promise<{ message: string }>): Promise<ReviewResult> {
  try {
    const reviewer = await requirePermission('payments.review');
    const { message } = await fn(reviewer);
    return { success: true, message };
  } catch (error) {
    if (error instanceof ReviewError || error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }
    console.error('[payments] review error:', error);
    return { success: false, error: 'No se pudo procesar la revisión. Intenta nuevamente.' };
  }
}

/**
 * Aprueba un pago manual.
 * - Boletos de sorteo: crea las participaciones solicitadas y las vincula al pago.
 * - Planes: crea (o renueva) la suscripción del usuario y lo inscribe en los sorteos activos.
 */
export async function approveManualPayment(params: ApprovePaymentParams): Promise<ReviewResult> {
  return toReviewResult((reviewer) => approve(params, reviewer));
}

/** Rechaza un pago manual con un motivo específico */
export async function rejectManualPayment(params: RejectPaymentParams): Promise<ReviewResult> {
  return toReviewResult((reviewer) => reject(params, reviewer));
}

async function approve(params: ApprovePaymentParams, reviewer: User) {
  const adminComment = cleanComment(params.adminComment);

  const outcome = await prisma.$transaction(
    async (tx) => {
      const transaction = await lockPendingTransaction(tx, params.transactionId, reviewer);
      const metadata = (transaction.metadata ?? {}) as Record<string, unknown>;
      const reviewData = { status: 'approved', reviewed_by: reviewer.id, reviewed_at: new Date(), admin_comment: adminComment };

      if (transaction.discount_code_id) {
        await tx.discount_redemptions.updateMany({ where: { transaction_id: transaction.id }, data: { status: 'confirmed' } });
      }

      if (transaction.transaction_type === 'raffle_ticket' && transaction.raffle_id) {
        const requested = Number(metadata.tickets_requested ?? 1);
        const tickets = Number.isInteger(requested) && requested > 0 ? requested : 1;

        const raffle = await tx.raffles.findUnique({ where: { id: transaction.raffle_id }, select: { status: true, entry_mode: true, title: true } });
        if (!raffle || raffle.status !== 'active') {
          throw new ReviewError('El sorteo ya no está activo, así que no se pueden emitir boletos. Rechaza el pago indicando que se hará la devolución.');
        }
        if (raffle.entry_mode === 'subscribers_only') {
          throw new ReviewError('Este sorteo es solo para suscriptores y no admite boletos comprados. Rechaza el pago para gestionar la devolución.');
        }

        await tx.payment_transactions.update({ where: { id: transaction.id }, data: reviewData });

        let entries;
        try {
          entries = await createRaffleEntries(tx, {
            raffleId: transaction.raffle_id,
            userId: transaction.user_id,
            entrySource: 'manual_purchase',
            subscriptionId: transaction.subscription_id,
            paymentTransactionId: transaction.id,
            count: tickets,
          });
        } catch (entryError) {
          throw new ReviewError(`No se pudieron emitir los boletos: ${entryError instanceof Error ? entryError.message : 'error desconocido'}`);
        }

        const numbers = entries.map((entry) => entry.ticket_number);
        await tx.notifications.create({
          data: {
            user_id: transaction.user_id,
            title: 'Pago aprobado',
            message:
              tickets === 1
                ? `Tu pago para "${raffle.title}" fue verificado. Tu boleto es el ${numbers[0]}.`
                : `Tu pago para "${raffle.title}" fue verificado. Tus ${tickets} boletos: ${numbers.slice(0, 10).join(', ')}${numbers.length > 10 ? '…' : ''}.`,
            type: 'success',
            action_url: `/app/boletos`,
          },
        });

        await recordAudit(
          { actorId: reviewer.id, actorRole: reviewer.role, action: 'payment.approve', entityType: 'payment', entityId: transaction.id, data: { tickets: numbers, amount: transaction.amount } },
          tx,
        );

        return {
          kind: 'raffle' as const,
          transaction,
          message: tickets === 1 ? `Pago aprobado. Boleto ${numbers[0]} emitido.` : `Pago aprobado. ${tickets} boletos emitidos.`,
        };
      }

      if (transaction.transaction_type === 'subscription') {
        const planId = typeof metadata.plan_id === 'string' ? metadata.plan_id : null;
        const plan = planId ? await tx.plans.findUnique({ where: { id: planId } }) : null;
        if (!plan) throw new ReviewError('El plan asociado a este pago ya no existe');

        await tx.payment_transactions.update({ where: { id: transaction.id }, data: reviewData });

        const now = new Date();
        const current = await tx.subscriptions.findFirst({
          where: { user_id: transaction.user_id, status: 'active', current_period_end: { gt: now } },
          orderBy: { current_period_end: 'desc' },
        });

        let subscription;
        if (current && current.plan_id === plan.id) {
          // Renovación del mismo plan: el nuevo período empieza cuando termina el actual
          subscription = await tx.subscriptions.update({
            where: { id: current.id },
            data: { current_period_end: addInterval(current.current_period_end!, plan.interval), cancel_at_period_end: false },
          });
        } else {
          // Cambio de plan: un usuario solo puede tener una suscripción activa
          await tx.subscriptions.updateMany({
            where: { user_id: transaction.user_id, status: 'active' },
            data: { status: 'canceled' },
          });
          subscription = await tx.subscriptions.create({
            data: {
              user_id: transaction.user_id,
              plan_id: plan.id,
              status: 'active',
              current_period_start: now,
              current_period_end: addInterval(now, plan.interval),
              metadata: { approved_transaction_id: transaction.id },
            },
          });
        }

        await tx.payment_transactions.update({ where: { id: transaction.id }, data: { subscription_id: subscription.id } });
        await recordAudit(
          { actorId: reviewer.id, actorRole: reviewer.role, action: 'payment.approve', entityType: 'payment', entityId: transaction.id, data: { plan_id: plan.id, subscription_id: subscription.id, amount: transaction.amount } },
          tx,
        );

        return { kind: 'subscription' as const, transaction, plan, subscription, message: `Pago aprobado. Suscripción ${plan.name} activa.` };
      }

      throw new ReviewError('Tipo de pago no reconocido; no se puede aprobar automáticamente.');
    },
    { timeout: 30_000 },
  );

  if (outcome.kind === 'subscription') {
    const enrolled = await enrollSubscriptionInActiveRaffles(outcome.subscription.id);
    await prisma.notifications.create({
      data: {
        user_id: outcome.transaction.user_id,
        title: 'Suscripción activada',
        message: `Tu plan ${outcome.plan.name} ya está activo hasta el ${outcome.subscription.current_period_end?.toLocaleDateString('es-EC')}.${enrolled > 0 ? ` Participas automáticamente en ${enrolled} sorteo(s).` : ''}`,
        type: 'success',
        action_url: '/app/planes',
      },
    });
    revalidatePath('/app/planes');
  }

  await grantReferralRewardIfEligible(outcome.transaction.user_id, outcome.transaction.id);
  revalidatePayments(outcome.transaction.raffle_id);

  return { message: outcome.message };
}

async function reject(params: RejectPaymentParams, reviewer: User) {
  const reason = String(params.rejectionReason ?? '').trim();
  if (reason.length < 3 || reason.length > 300) {
    throw new ReviewError('Indica el motivo del rechazo (entre 3 y 300 caracteres).');
  }
  const adminComment = cleanComment(params.adminComment);

  const transaction = await prisma.$transaction(async (tx) => {
    const transaction = await lockPendingTransaction(tx, params.transactionId, reviewer);

    await tx.payment_transactions.update({
      where: { id: transaction.id },
      data: {
        status: 'rejected',
        reviewed_by: reviewer.id,
        reviewed_at: new Date(),
        rejection_reason: reason,
        admin_comment: adminComment,
      },
    });

    // El código de descuento vuelve a estar disponible
    await tx.discount_redemptions.updateMany({ where: { transaction_id: transaction.id }, data: { status: 'released' } });

    await tx.notifications.create({
      data: {
        user_id: transaction.user_id,
        title: 'Pago no verificado',
        message: `No pudimos verificar tu pago. Motivo: ${reason}`,
        type: 'error',
        action_url: transaction.raffle_id ? `/app/sorteos/${transaction.raffle_id}` : '/app/planes',
      },
    });

    await recordAudit(
      { actorId: reviewer.id, actorRole: reviewer.role, action: 'payment.reject', entityType: 'payment', entityId: transaction.id, data: { reason } },
      tx,
    );

    return transaction;
  });

  revalidatePayments(transaction.raffle_id);
  return { message: 'Pago rechazado' };
}
