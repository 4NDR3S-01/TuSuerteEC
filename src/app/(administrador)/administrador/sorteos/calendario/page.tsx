import { prisma, toPlain } from '../../../../../lib/db';
import { requirePagePermission } from '../../../../../lib/auth/get-user';
import { RafflesCalendar } from '../../../../../components/admin/raffles-calendar';

export const dynamic = 'force-dynamic';

export default async function RafflesCalendarPage() {
  await requirePagePermission('raffles.manage', '/administrador/sorteos/calendario');
  const raffles = await prisma.raffles.findMany({
    select: { id: true, title: true, status: true, start_date: true, end_date: true, draw_date: true },
    orderBy: { draw_date: 'asc' },
  });
  return <RafflesCalendar raffles={toPlain(raffles)} />;
}
