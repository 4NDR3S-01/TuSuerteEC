import { Prisma } from '@prisma/client';
import { prisma } from '../db';

type Tx = Prisma.TransactionClient;

export type EntrySource = 'manual_purchase' | 'subscription';

type CreateEntryParams = {
  raffleId: string;
  userId: string;
  entrySource: EntrySource;
  subscriptionId?: string | null;
  paymentTransactionId?: string | null;
};

/**
 * Crea una participación en un sorteo de forma segura (reemplaza la RPC `create_raffle_entry_safe`).
 * Bloquea la fila del sorteo para que dos compras simultáneas no generen el mismo número de boleto
 * ni superen el límite de participaciones por usuario.
 */
export async function createRaffleEntrySafe(tx: Tx, params: CreateEntryParams) {
  const [raffle] = await tx.$queryRaw<Array<{ id: string; status: string; max_entries_per_user: number | null }>>`
    SELECT id, status, max_entries_per_user FROM raffles WHERE id = ${params.raffleId}::uuid FOR UPDATE
  `;


  if (!raffle) {
    throw new Error('Sorteo no encontrado');
  }

  if (raffle.status !== 'active') {
    throw new Error('El sorteo no está activo');
  }

  if (raffle.max_entries_per_user) {
    const userEntries = await tx.raffle_entries.count({
      where: { raffle_id: params.raffleId, user_id: params.userId },
    });
    if (userEntries >= raffle.max_entries_per_user) {
      throw new Error(`Alcanzaste el máximo de ${raffle.max_entries_per_user} participaciones para este sorteo`);
    }
  }

  // Siguiente número correlativo (usar el máximo y no el conteo evita choques si se borra una fila)
  const [{ max }] = await tx.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(ticket_number::int) AS max FROM raffle_entries WHERE raffle_id = ${params.raffleId}::uuid
  `;
  const ticketNumber = String(Number(max ?? 0) + 1).padStart(6, '0');

  return tx.raffle_entries.create({
    data: {
      raffle_id: params.raffleId,
      user_id: params.userId,
      entry_source: params.entrySource,
      subscription_id: params.subscriptionId ?? null,
      payment_transaction_id: params.paymentTransactionId ?? null,
      ticket_number: ticketNumber,
    },
  });
}

/** Crea `count` boletos para un usuario dentro de una sola transacción */
export async function createRaffleEntries(tx: Tx, params: CreateEntryParams & { count: number }) {
  const entries = [];
  for (let i = 0; i < params.count; i += 1) {
    entries.push(await createRaffleEntrySafe(tx, params));
  }
  return entries;
}

function activeSubscriptionWhere(now = new Date()): Prisma.subscriptionsWhereInput {
  return { status: 'active', current_period_end: { gt: now } };
}

/**
 * Inscribe automáticamente una suscripción activa en los sorteos activos que aceptan suscriptores.
 * Respeta `max_concurrent_raffles` del plan y no duplica la participación por suscripción.
 */
export async function enrollSubscriptionInActiveRaffles(subscriptionId: string) {
  const subscription = await prisma.subscriptions.findFirst({
    where: { id: subscriptionId, ...activeSubscriptionWhere() },
    include: { plans: { select: { max_concurrent_raffles: true } } },
  });

  if (!subscription) return 0;

  const raffles = await prisma.raffles.findMany({
    where: {
      status: 'active',
      entry_mode: { not: 'tickets_only' },
      draw_date: { gt: new Date() },
      OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
    },
    orderBy: { draw_date: 'asc' },
    select: { id: true },
  });

  let enrolled = 0;

  for (const raffle of raffles) {
    const created = await enrollUserInRaffle(raffle.id, subscription.user_id, subscription.id, subscription.plans?.max_concurrent_raffles ?? null);
    if (created) enrolled += 1;
  }

  return enrolled;
}

/** Inscribe a todos los suscriptores activos en un sorteo recién activado */
export async function enrollActiveSubscribersInRaffle(raffleId: string) {
  const raffle = await prisma.raffles.findUnique({ where: { id: raffleId }, select: { status: true, entry_mode: true, end_date: true } });
  if (!raffle || raffle.status !== 'active' || raffle.entry_mode === 'tickets_only') return 0;
  if (raffle.end_date && raffle.end_date <= new Date()) return 0;

  const subscriptions = await prisma.subscriptions.findMany({
    where: activeSubscriptionWhere(),
    include: { plans: { select: { max_concurrent_raffles: true } } },
    orderBy: { created_at: 'asc' },
  });

  let enrolled = 0;
  const seenUsers = new Set<string>();

  for (const subscription of subscriptions) {
    // Un usuario con varias suscripciones activas solo recibe una participación automática
    if (seenUsers.has(subscription.user_id)) continue;
    seenUsers.add(subscription.user_id);

    const created = await enrollUserInRaffle(raffleId, subscription.user_id, subscription.id, subscription.plans?.max_concurrent_raffles ?? null);
    if (created) enrolled += 1;
  }

  return enrolled;
}

async function enrollUserInRaffle(raffleId: string, userId: string, subscriptionId: string, maxConcurrent: number | null) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Serializa inscripciones simultáneas del mismo usuario (límite de sorteos simultáneos)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`enroll:${userId}`}))`;
      const alreadyEnrolled = await tx.raffle_entries.count({
        where: { raffle_id: raffleId, user_id: userId, entry_source: 'subscription' },
      });
      if (alreadyEnrolled > 0) return false;

      if (maxConcurrent && maxConcurrent > 0) {
        const concurrent = await tx.raffle_entries.count({
          where: { user_id: userId, entry_source: 'subscription', raffles: { status: 'active' } },
        });
        if (concurrent >= maxConcurrent) return false;
      }

      await createRaffleEntrySafe(tx, { raffleId, userId, entrySource: 'subscription', subscriptionId });
      return true;
    });
  } catch (error) {
    // Por ejemplo, si el usuario ya alcanzó el máximo de participaciones del sorteo
    console.warn('[enrollUserInRaffle] no se pudo inscribir', { raffleId, userId, error: (error as Error).message });
    return false;
  }
}
