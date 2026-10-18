import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { recordAudit } from '../audit';
import type { User } from '../auth/get-user';
import {
  DRAW_ALGORITHM,
  computeCommitment,
  computeEntriesHash,
  generateSeed,
  selectWinningTickets,
} from './draw-algorithm';

type Tx = Prisma.TransactionClient;

export type RaffleDrawResult = {
  winners: Array<{
    entry_id: string;
    user_id: string;
    ticket_number: string;
    prize_position: number;
    user_name?: string;
  }>;
  drawSeed: string;
  totalParticipants: number;
  totalWinners: number;
};

type LockedRaffle = {
  id: string;
  title: string;
  status: string;
  entry_mode: string;
  total_winners: number;
  entries_hash: string | null;
  draw_commitment: string | null;
};

async function lockRaffle(tx: Tx, raffleId: string): Promise<LockedRaffle> {
  const [raffle] = await tx.$queryRaw<LockedRaffle[]>`
    SELECT id, title, status, entry_mode, total_winners, entries_hash, draw_commitment
    FROM raffles WHERE id = ${raffleId}::uuid FOR UPDATE
  `;
  if (!raffle) throw new Error('Sorteo no encontrado');
  return raffle;
}

/**
 * Participaciones válidas según la modalidad del sorteo.
 * - subscribers_only: solo participaciones automáticas de suscriptores
 * - tickets_only: solo boletos comprados
 * - hybrid: todas
 */
export function eligibleEntriesWhere(raffleId: string, entryMode: string): Prisma.raffle_entriesWhereInput {
  if (entryMode === 'subscribers_only') return { raffle_id: raffleId, entry_source: 'subscription' };
  if (entryMode === 'tickets_only') return { raffle_id: raffleId, entry_source: 'manual_purchase' };
  return { raffle_id: raffleId };
}

/**
 * Cierra un sorteo activo: deja de aceptar participaciones, fija la lista de boletos
 * y publica el compromiso (huella) de la semilla secreta que se usará en el sorteo.
 */
export async function closeRaffle(raffleId: string, actor: User) {
  return prisma.$transaction(async (tx) => {
    const raffle = await lockRaffle(tx, raffleId);
    if (raffle.status !== 'active') {
      throw new Error('Solo se puede cerrar un sorteo activo.');
    }

    const entries = await tx.raffle_entries.findMany({
      where: eligibleEntriesWhere(raffleId, raffle.entry_mode),
      select: { ticket_number: true },
    });

    const seed = generateSeed();
    const [commitment, entriesHash] = await Promise.all([
      computeCommitment(seed),
      computeEntriesHash(entries.map((entry) => entry.ticket_number)),
    ]);

    await tx.raffle_draw_secrets.upsert({
      where: { raffle_id: raffleId },
      update: { seed },
      create: { raffle_id: raffleId, seed },
    });

    await tx.raffles.update({
      where: { id: raffleId },
      data: {
        status: 'closed',
        closed_at: new Date(),
        draw_commitment: commitment,
        entries_hash: entriesHash,
        draw_algorithm: DRAW_ALGORITHM,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'raffle.close',
        entityType: 'raffle',
        entityId: raffleId,
        data: { eligible_entries: entries.length, commitment, entries_hash: entriesHash },
      },
      tx,
    );

    return { commitment, entriesHash, eligibleEntries: entries.length };
  });
}

/**
 * Ejecuta el sorteo de un sorteo cerrado: revela la semilla comprometida al cierre,
 * selecciona a los ganadores con el algoritmo verificable y registra todo en una transacción.
 */
export async function executeRaffleDraw(raffleId: string, actor: User): Promise<RaffleDrawResult> {
  const result = await prisma.$transaction(
    async (tx) => {
      // El bloqueo de fila impide ejecutar dos veces el mismo sorteo en paralelo
      const raffle = await lockRaffle(tx, raffleId);

      if (raffle.status !== 'closed') {
        throw new Error(
          raffle.status === 'drawn' || raffle.status === 'completed'
            ? 'Este sorteo ya fue ejecutado.'
            : 'El sorteo debe estar cerrado para ejecutarse.',
        );
      }

      const secret = await tx.raffle_draw_secrets.findUnique({ where: { raffle_id: raffleId } });
      if (!secret || !raffle.draw_commitment || !raffle.entries_hash) {
        throw new Error('El sorteo no tiene un compromiso de semilla registrado. Ciérralo nuevamente desde el panel.');
      }

      const entries = await tx.raffle_entries.findMany({
        where: eligibleEntriesWhere(raffleId, raffle.entry_mode),
        select: { id: true, user_id: true, ticket_number: true, profiles: { select: { full_name: true } } },
        orderBy: { ticket_number: 'asc' },
      });

      if (entries.length === 0) {
        throw new Error('No hay participaciones válidas para este sorteo.');
      }

      // La lista de boletos debe ser exactamente la que se fijó al cerrar
      const tickets = entries.map((entry) => entry.ticket_number);
      const [entriesHash, commitment] = await Promise.all([computeEntriesHash(tickets), computeCommitment(secret.seed)]);
      if (entriesHash !== raffle.entries_hash || commitment !== raffle.draw_commitment) {
        await recordAudit({
          actorId: actor.id,
          actorRole: actor.role,
          action: 'raffle.draw_integrity_failed',
          entityType: 'raffle',
          entityId: raffleId,
          data: { expected_entries_hash: raffle.entries_hash, actual_entries_hash: entriesHash },
        });
        throw new Error('Las participaciones cambiaron después del cierre. El sorteo se detuvo por seguridad; revisa la auditoría.');
      }

      const winningTickets = await selectWinningTickets(tickets, raffle.total_winners, secret.seed);
      const byTicket = new Map(entries.map((entry) => [entry.ticket_number, entry]));
      const winners = winningTickets.map((ticket, index) => {
        const entry = byTicket.get(ticket)!;
        return {
          entry_id: entry.id,
          user_id: entry.user_id,
          ticket_number: ticket,
          prize_position: index + 1,
          user_name: entry.profiles?.full_name ?? undefined,
        };
      });

      await tx.raffles.update({
        where: { id: raffleId },
        data: { status: 'drawn', draw_seed: secret.seed, drawn_at: new Date() },
      });
      await tx.raffle_draw_secrets.delete({ where: { raffle_id: raffleId } });

      await tx.raffle_entries.updateMany({
        where: { id: { in: winners.map((winner) => winner.entry_id) } },
        data: { is_winner: true },
      });

      await tx.winners.createMany({
        data: winners.map((winner) => ({
          raffle_id: raffleId,
          entry_id: winner.entry_id,
          user_id: winner.user_id,
          prize_position: winner.prize_position,
          status: 'pending_contact',
          contact_attempts: 0,
        })),
      });

      await tx.notifications.createMany({
        data: winners.map((winner) => ({
          user_id: winner.user_id,
          title: '¡Ganaste un sorteo!',
          message: `Tu boleto ${winner.ticket_number} resultó ganador del sorteo "${raffle.title}". Nuestro equipo te contactará para coordinar la entrega del premio.`,
          type: 'prize',
          action_url: '/app/boletos',
        })),
      });

      await recordAudit(
        {
          actorId: actor.id,
          actorRole: actor.role,
          action: 'raffle.draw',
          entityType: 'raffle',
          entityId: raffleId,
          data: { seed: secret.seed, winning_tickets: winningTickets, eligible_entries: entries.length },
        },
        tx,
      );

      return { winners, drawSeed: secret.seed, totalParticipants: entries.length };
    },
    { timeout: 30_000 },
  );

  // Aviso a los demás participantes: el resultado ya se puede consultar
  const participants = await prisma.raffle_entries.findMany({
    where: { raffle_id: raffleId, is_winner: false },
    distinct: ['user_id'],
    select: { user_id: true },
  });
  const winnerIds = new Set(result.winners.map((winner) => winner.user_id));
  const others = participants.filter((participant) => !winnerIds.has(participant.user_id));
  if (others.length > 0) {
    await prisma.notifications.createMany({
      data: others.map((participant) => ({
        user_id: participant.user_id,
        title: 'Resultados publicados',
        message: 'Ya se realizó un sorteo en el que participabas. Consulta los resultados y verifica el procedimiento.',
        type: 'info',
        action_url: `/resultados/${raffleId}`,
      })),
    });
  }

  return { ...result, totalWinners: result.winners.length };
}

/**
 * Obtiene estadísticas de un sorteo
 */
export async function getRaffleStats(raffleId: string) {
  const [totalEntries, totalWinners, entriesBySource] = await Promise.all([
    prisma.raffle_entries.count({ where: { raffle_id: raffleId } }),
    prisma.winners.count({ where: { raffle_id: raffleId } }),
    prisma.raffle_entries.groupBy({ by: ['entry_source'], where: { raffle_id: raffleId }, _count: true }),
  ]);

  const sourceCounts = Object.fromEntries(entriesBySource.map((row) => [row.entry_source, row._count])) as Record<string, number>;

  return {
    totalEntries,
    totalWinners,
    entriesBySource: {
      subscription: sourceCounts.subscription || 0,
      manual_purchase: sourceCounts.manual_purchase || 0,
    },
    winRate: totalEntries ? ((totalWinners / totalEntries) * 100).toFixed(2) : '0',
  };
}
