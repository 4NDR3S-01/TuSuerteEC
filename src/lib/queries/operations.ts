import 'server-only';

import { prisma, toPlain } from '../db';

/**
 * Consultas compartidas por los paneles de staff y administración.
 * Los pagos pendientes se cargan completos; los ya revisados, solo los más recientes.
 */
export async function loadTransactionsForReview(reviewedLimit = 300) {
  const include = {
    profiles: { select: { id: true, full_name: true, email: true, id_number: true } },
    payment_methods: { select: { id: true, name: true, type: true, icon: true } },
    raffles: { select: { id: true, title: true, status: true } },
    subscriptions: { select: { id: true, plan_id: true, plans: { select: { name: true } } } },
    discount_codes: { select: { code: true } },
    reviewer: { select: { full_name: true } },
  } as const;

  const [pending, reviewed] = await Promise.all([
    prisma.payment_transactions.findMany({ where: { status: 'pending' }, include, orderBy: { created_at: 'asc' } }),
    prisma.payment_transactions.findMany({ where: { status: { not: 'pending' } }, include, orderBy: { reviewed_at: 'desc' }, take: reviewedLimit }),
  ]);

  return toPlain([...pending, ...reviewed]);
}

export async function loadWinners() {
  return toPlain(
    await prisma.winners.findMany({
      include: {
        raffles: { select: { id: true, title: true, draw_date: true } },
        profiles: { select: { id: true, full_name: true, email: true, phone_number: true } },
        raffle_entries: { select: { ticket_number: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  );
}

export async function loadLiveEvents() {
  const [events, totalCount, raffles] = await Promise.all([
    prisma.live_events.findMany({ include: { raffles: { select: { id: true, title: true } } }, orderBy: { start_at: 'desc' } }),
    prisma.live_events.count(),
    prisma.raffles.findMany({ where: { status: { in: ['active', 'closed', 'draft'] } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  return { events: toPlain(events), totalCount, raffles };
}
