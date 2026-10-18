import { prisma, toPlain } from '../../../../lib/db';
import { requirePagePermission } from '../../../../lib/auth/get-user';
import { RafflesTable } from '../../../../components/admin/raffles-table';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<{ crear?: string }> };

export default async function AdminRafflesPage({ searchParams }: PageProps) {
  await requirePagePermission('raffles.manage', '/administrador/sorteos');

  const raffles = await prisma.raffles.findMany({
    select: {
      id: true, title: true, description: true, prize_description: true, prize_category: true, image_url: true,
      start_date: true, end_date: true, draw_date: true, status: true, entry_mode: true, total_winners: true,
      max_entries_per_user: true, is_trending: true, ticket_price: true, terms: true, draw_commitment: true, created_at: true,
      _count: { select: { raffle_entries: true, payment_transactions: { where: { status: 'pending' } } } },
    },
    orderBy: { created_at: 'desc' },
  });

  return <RafflesTable initialRaffles={toPlain(raffles)} openCreate={(await searchParams)?.crear === 'true'} />;
}
