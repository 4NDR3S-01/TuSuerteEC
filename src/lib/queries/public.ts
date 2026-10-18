import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma, toPlain } from '../db';

/** Campos públicos de un sorteo (nunca incluye semillas secretas ni datos internos) */
export const PUBLIC_RAFFLE_SELECT = {
  id: true,
  title: true,
  description: true,
  prize_description: true,
  prize_category: true,
  image_url: true,
  status: true,
  entry_mode: true,
  ticket_price: true,
  total_winners: true,
  max_entries_per_user: true,
  start_date: true,
  end_date: true,
  draw_date: true,
  is_trending: true,
  terms: true,
  draw_commitment: true,
  entries_hash: true,
  draw_algorithm: true,
  closed_at: true,
  drawn_at: true,
  created_at: true,
  _count: { select: { raffle_entries: true } },
} satisfies Prisma.rafflesSelect;

/** Estados que el público puede ver (los borradores son internos) */
export const PUBLIC_STATUSES = ['active', 'closed', 'drawn', 'completed'];

export type PublicRaffleFilters = {
  q?: string;
  category?: string;
  mode?: string;
  sort?: 'closing' | 'newest' | 'price_asc' | 'price_desc';
  status?: 'open' | 'finished';
};

export async function listPublicRaffles(filters: PublicRaffleFilters = {}, take = 24) {
  const now = new Date();
  const where: Prisma.rafflesWhereInput =
    filters.status === 'finished'
      ? { status: { in: ['drawn', 'completed'] } }
      : { status: 'active', OR: [{ end_date: null }, { end_date: { gt: now } }] };

  if (filters.q) {
    const q = filters.q.slice(0, 80);
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { prize_description: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }
  if (filters.category) where.prize_category = filters.category;
  if (filters.mode) where.entry_mode = filters.mode;

  const orderBy: Prisma.rafflesOrderByWithRelationInput[] =
    filters.sort === 'newest'
      ? [{ created_at: 'desc' }]
      : filters.sort === 'price_asc'
        ? [{ ticket_price: { sort: 'asc', nulls: 'last' } }]
        : filters.sort === 'price_desc'
          ? [{ ticket_price: { sort: 'desc', nulls: 'last' } }]
          : filters.status === 'finished'
            ? [{ drawn_at: 'desc' }]
            : [{ is_trending: 'desc' }, { end_date: 'asc' }];

  const raffles = await prisma.raffles.findMany({ where, select: PUBLIC_RAFFLE_SELECT, orderBy, take });
  return toPlain(raffles).map(({ _count, ...raffle }) => ({ ...raffle, entries_count: _count.raffle_entries }));
}

export async function getPublicRaffle(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const raffle = await prisma.raffles.findFirst({ where: { id, status: { in: PUBLIC_STATUSES } }, select: PUBLIC_RAFFLE_SELECT });
  if (!raffle) return null;
  const { _count, ...rest } = toPlain(raffle);
  return { ...rest, entries_count: _count.raffle_entries };
}

/** Indicadores reales para la portada (solo se muestran si son mayores que cero) */
export async function getPublicStats() {
  const [openRaffles, drawnRaffles, deliveredPrizes] = await Promise.all([
    prisma.raffles.count({ where: { status: 'active' } }),
    prisma.raffles.count({ where: { status: { in: ['drawn', 'completed'] } } }),
    prisma.winners.count({ where: { status: 'prize_delivered' } }),
  ]);
  return { openRaffles, drawnRaffles, deliveredPrizes };
}
