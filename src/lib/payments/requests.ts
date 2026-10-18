import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { recordAudit } from '../audit';
import type { User } from '../auth/get-user';
import { DiscountError, resolveDiscount, type DiscountScope } from '../marketing/discounts';
import { fileNameFromUrl, safeStoredFileUrl } from '../uploads';
import { fromCents, toCents } from './money';
import { fetchPaymentMethodById } from './server';
import { MANUAL_PAYMENT_TYPES, type PaymentMethod } from './types';

type Tx = Prisma.TransactionClient;

/** Error con mensaje apto para mostrar al participante */
export class PaymentRequestError extends Error {}

export const MAX_TICKETS_PER_REQUEST = 100;
export const MAX_PENDING_REQUESTS_PER_RAFFLE = 3;

export type PaymentProof = {
  paymentMethodId: string;
  reference: string;
  receiptUrl?: string | null;
  notes?: string | null;
  discountCode?: string | null;
};

async function loadPaymentMethod(paymentMethodId: string, scope: DiscountScope): Promise<PaymentMethod> {
  const method = await fetchPaymentMethodById(String(paymentMethodId ?? ''));
  const scopes = method?.config?.scopes ?? [];
  if (!method || !method.is_active || !MANUAL_PAYMENT_TYPES.includes(method.type) || !scopes.includes(scope)) {
    throw new PaymentRequestError(scope === 'plans' ? 'Método de pago no disponible para planes.' : 'Método de pago no disponible para sorteos.');
  }
  return method;
}

function requiresProof(method: PaymentMethod) {
  return method.type === 'manual_transfer'
    ? method.config?.manual?.requiresProof ?? true
    : method.config?.qr?.requiresProof ?? true;
}

/** Valida referencia, notas y comprobante (que debe haber sido subido por el mismo usuario) */
async function validateProof(user: User, method: PaymentMethod, proof: PaymentProof) {
  const reference = String(proof.reference ?? '').trim();
  if (reference.length < 3 || reference.length > 60 || !/^[\p{L}\p{N}\s\-_.#/]+$/u.test(reference)) {
    throw new PaymentRequestError('Ingresa el número de comprobante o transacción (3 a 60 caracteres, sin símbolos especiales).');
  }

  const notes = proof.notes ? String(proof.notes).trim().slice(0, 500) : null;

  let receiptUrl: string | null = null;
  if (proof.receiptUrl) {
    receiptUrl = safeStoredFileUrl(String(proof.receiptUrl), 'payment-receipts');
    const upload = receiptUrl
      ? await prisma.uploads.findUnique({ where: { file_name: fileNameFromUrl(receiptUrl) }, select: { owner_id: true } })
      : null;
    if (!receiptUrl || upload?.owner_id !== user.id) {
      throw new PaymentRequestError('El comprobante adjunto no es válido. Súbelo nuevamente.');
    }
  }

  if (requiresProof(method) && !receiptUrl) {
    throw new PaymentRequestError('Debes adjuntar el comprobante de pago.');
  }

  return { reference, notes, receiptUrl };
}

/**
 * Un mismo comprobante no puede usarse en dos solicitudes vigentes del mismo método de pago.
 * El bloqueo consultivo serializa solicitudes simultáneas con la misma referencia.
 */
async function assertUniqueReference(tx: Tx, paymentMethodId: string, reference: string) {
  const key = `${paymentMethodId}:${reference.toUpperCase()}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  const duplicates = await tx.payment_transactions.count({
    where: {
      payment_method_id: paymentMethodId,
      receipt_reference: { equals: reference, mode: 'insensitive' },
      status: { in: ['pending', 'approved', 'completed'] },
    },
  });
  if (duplicates > 0) {
    throw new PaymentRequestError('Este número de comprobante ya fue registrado. Si crees que es un error, contáctanos.');
  }
}

async function applyDiscount(tx: Tx, params: { code?: string | null; userId: string; scope: DiscountScope; raffleId?: string | null; subtotal: number }) {
  if (!params.code) return null;
  try {
    return await resolveDiscount(tx, { ...params, code: params.code, lock: true });
  } catch (error) {
    if (error instanceof DiscountError) throw new PaymentRequestError(error.message);
    throw error;
  }
}

function toUserError(error: unknown, fallback: string): never {
  if (error instanceof PaymentRequestError) throw error;
  console.error('[payments] request error:', error);
  throw new PaymentRequestError(fallback);
}

// ---------------------------------------------------------------------------
// Boletos de sorteo
// ---------------------------------------------------------------------------

export type RafflePurchaseInput = PaymentProof & { tickets: number; amount?: number };

/** Valida que el sorteo acepte compras ahora mismo y devuelve sus datos */
export async function loadPurchasableRaffle(raffleId: string) {
  const raffle = await prisma.raffles.findUnique({
    where: { id: String(raffleId ?? '') },
    select: { id: true, title: true, status: true, ticket_price: true, entry_mode: true, max_entries_per_user: true, start_date: true, end_date: true },
  });

  if (!raffle) throw new PaymentRequestError('No se encontró el sorteo seleccionado.');
  if (raffle.status !== 'active') throw new PaymentRequestError('Este sorteo ya no está recibiendo participaciones.');
  if (raffle.entry_mode === 'subscribers_only') {
    throw new PaymentRequestError('En este sorteo solo participan los suscriptores; no se venden boletos.');
  }
  const now = new Date();
  if (raffle.start_date && raffle.start_date > now) throw new PaymentRequestError('Este sorteo todavía no abre sus participaciones.');
  if (raffle.end_date && raffle.end_date <= now) throw new PaymentRequestError('El período de participación de este sorteo ya terminó.');
  if (!raffle.ticket_price || raffle.ticket_price <= 0) throw new PaymentRequestError('Este sorteo no tiene un precio configurado.');

  return raffle as typeof raffle & { ticket_price: number };
}

/** Boletos que el usuario ya tiene más los que esperan aprobación */
async function ticketsHeldOrPending(tx: Tx | typeof prisma, raffleId: string, userId: string) {
  const [entries, pending] = await Promise.all([
    tx.raffle_entries.count({ where: { raffle_id: raffleId, user_id: userId } }),
    tx.payment_transactions.findMany({
      where: { raffle_id: raffleId, user_id: userId, status: 'pending', transaction_type: 'raffle_ticket' },
      select: { metadata: true },
    }),
  ]);
  const pendingTickets = pending.reduce((sum, row) => sum + (Number((row.metadata as { tickets_requested?: number } | null)?.tickets_requested) || 1), 0);
  return { entries, pendingTickets, pendingRequests: pending.length };
}

export async function createRafflePaymentRequest(user: User, raffleId: string, input: RafflePurchaseInput) {
  const tickets = Number(input.tickets);
  if (!Number.isInteger(tickets) || tickets < 1 || tickets > MAX_TICKETS_PER_REQUEST) {
    throw new PaymentRequestError(`Puedes solicitar entre 1 y ${MAX_TICKETS_PER_REQUEST} boletos por pago.`);
  }

  const raffle = await loadPurchasableRaffle(raffleId);
  const method = await loadPaymentMethod(input.paymentMethodId, 'raffles');
  const proof = await validateProof(user, method, input);
  const subtotal = fromCents(toCents(raffle.ticket_price) * tickets);

  try {
    return await prisma.$transaction(async (tx) => {
      // Bloquear el sorteo serializa las solicitudes del mismo sorteo (límites por usuario)
      await tx.$queryRaw`SELECT id FROM raffles WHERE id = ${raffle.id}::uuid FOR UPDATE`;

      const held = await ticketsHeldOrPending(tx, raffle.id, user.id);
      if (held.pendingRequests >= MAX_PENDING_REQUESTS_PER_RAFFLE) {
        throw new PaymentRequestError('Tienes varios pagos en revisión para este sorteo. Espera a que los verifiquemos.');
      }
      if (raffle.max_entries_per_user && held.entries + held.pendingTickets + tickets > raffle.max_entries_per_user) {
        const available = Math.max(0, raffle.max_entries_per_user - held.entries - held.pendingTickets);
        throw new PaymentRequestError(
          available === 0
            ? `Ya alcanzaste el máximo de ${raffle.max_entries_per_user} participaciones (incluye pagos en revisión).`
            : `Solo puedes solicitar ${available} boleto(s) más en este sorteo.`,
        );
      }

      await assertUniqueReference(tx, method.id, proof.reference);
      const discount = await applyDiscount(tx, { code: input.discountCode, userId: user.id, scope: 'raffles', raffleId: raffle.id, subtotal });
      const amount = discount ? discount.total : subtotal;

      // Si el cliente envió el monto, debe coincidir con el calculado (evita pagar un valor distinto)
      if (input.amount !== undefined && input.amount !== null && toCents(Number(input.amount)) !== toCents(amount)) {
        throw new PaymentRequestError(`El monto a pagar es ${amount.toFixed(2)} USD. Actualiza la página e intenta de nuevo.`);
      }

      const transaction = await tx.payment_transactions.create({
        data: {
          user_id: user.id,
          raffle_id: raffle.id,
          payment_method_id: method.id,
          transaction_type: 'raffle_ticket',
          amount,
          subtotal,
          discount_amount: discount?.discount ?? 0,
          discount_code_id: discount?.codeId ?? null,
          currency: method.config?.currency ?? 'USD',
          status: 'pending',
          receipt_reference: proof.reference,
          receipt_url: proof.receiptUrl,
          metadata: {
            payment_type: method.type,
            payment_method_name: method.name,
            notes: proof.notes,
            raffle: { id: raffle.id, title: raffle.title },
            ticket_price: raffle.ticket_price,
            tickets_requested: tickets,
            amount_confirmed: amount,
            discount_code: discount?.code ?? null,
            requested_at: new Date().toISOString(),
          },
        },
      });

      if (discount) {
        await tx.discount_redemptions.create({
          data: { code_id: discount.codeId, user_id: user.id, transaction_id: transaction.id, amount: discount.discount },
        });
      }

      await recordAudit(
        { actorId: user.id, actorRole: user.role, action: 'payment.request', entityType: 'payment', entityId: transaction.id, data: { raffle_id: raffle.id, tickets, amount } },
        tx,
      );

      return { transactionId: transaction.id, amount, tickets, method };
    });
  } catch (error) {
    toUserError(error, 'No pudimos registrar tu pago. Intenta nuevamente.');
  }
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

export async function createPlanPaymentRequest(user: User, planId: string, input: PaymentProof) {
  const plan = await prisma.plans.findUnique({ where: { id: String(planId ?? '') } });
  if (!plan || !plan.is_active) throw new PaymentRequestError('El plan seleccionado no está disponible.');

  const method = await loadPaymentMethod(input.paymentMethodId, 'plans');
  const proof = await validateProof(user, method, input);
  const subtotal = fromCents(toCents(plan.price));

  try {
    return await prisma.$transaction(async (tx) => {
      // Serializa las solicitudes del mismo usuario
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`plan-request:${user.id}`}))`;

      const pending = await tx.payment_transactions.count({
        where: { user_id: user.id, transaction_type: 'subscription', status: 'pending' },
      });
      if (pending > 0) {
        throw new PaymentRequestError('Ya tienes una solicitud de suscripción en revisión. Espera a que la verifiquemos.');
      }

      await assertUniqueReference(tx, method.id, proof.reference);
      const discount = await applyDiscount(tx, { code: input.discountCode, userId: user.id, scope: 'plans', subtotal });
      const amount = discount ? discount.total : subtotal;

      const transaction = await tx.payment_transactions.create({
        data: {
          user_id: user.id,
          payment_method_id: method.id,
          transaction_type: 'subscription',
          amount,
          subtotal,
          discount_amount: discount?.discount ?? 0,
          discount_code_id: discount?.codeId ?? null,
          currency: (plan.currency || 'USD').toUpperCase(),
          status: 'pending',
          receipt_reference: proof.reference,
          receipt_url: proof.receiptUrl,
          metadata: {
            payment_type: method.type,
            payment_method_name: method.name,
            notes: proof.notes,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_interval: plan.interval,
            plan_price: plan.price,
            plan_currency: plan.currency,
            discount_code: discount?.code ?? null,
            requested_at: new Date().toISOString(),
          },
        },
      });

      if (discount) {
        await tx.discount_redemptions.create({
          data: { code_id: discount.codeId, user_id: user.id, transaction_id: transaction.id, amount: discount.discount },
        });
      }

      await recordAudit(
        { actorId: user.id, actorRole: user.role, action: 'payment.request', entityType: 'payment', entityId: transaction.id, data: { plan_id: plan.id, amount } },
        tx,
      );

      return { transactionId: transaction.id, amount, plan };
    });
  } catch (error) {
    toUserError(error, 'No pudimos registrar tu solicitud. Intenta nuevamente.');
  }
}

/** Vista previa del descuento para mostrar el total antes de pagar (no reserva el código) */
export async function previewDiscount(user: User, params: { code: string; scope: DiscountScope; raffleId?: string | null; subtotal: number }) {
  try {
    return await resolveDiscount(prisma as unknown as Tx, { ...params, userId: user.id });
  } catch (error) {
    if (error instanceof DiscountError) throw new PaymentRequestError(error.message);
    throw error;
  }
}
