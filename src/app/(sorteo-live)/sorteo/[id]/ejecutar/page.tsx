import { prisma, toPlain } from '../../../../../lib/db';
export const dynamic = 'force-dynamic';

import { requirePagePermission } from '../../../../../lib/auth/get-user';
import { eligibleEntriesWhere } from '../../../../../lib/raffle/raffle-algorithm';
import { RaffleExecution } from '../../../../../components/admin/raffle-execution';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExecuteRafflePage({ params }: PageProps) {
  await requirePagePermission('raffles.draw', '/administrador/sorteos');
  
  const { id } = await params;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const raffle = UUID_PATTERN.test(id)
    ? await prisma.raffles.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          prize_description: true,
          prize_category: true,
          image_url: true,
          status: true,
          total_winners: true,
          draw_date: true,
          entry_mode: true,
          draw_seed: true,
          draw_commitment: true,
          entries_hash: true,
          created_at: true,
        },
      })
    : null;

  if (!raffle) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--hero-gradient)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Sorteo no encontrado</h1>
          <p className="text-xl text-white/80">
            El sorteo que buscas no existe o no tienes permisos para verlo.
          </p>
        </div>
      </div>
    );
  }

  // Obtener estadísticas del sorteo y ganadores si ya existe
  // Solo cuentan los boletos válidos según la modalidad (p. ej., en "solo suscriptores" no cuentan los comprados)
  const [totalEntries, totalWinners, existingWinners] = await Promise.all([
    prisma.raffle_entries.count({ where: eligibleEntriesWhere(id, raffle.entry_mode) }),
    prisma.winners.count({ where: { raffle_id: id } }),
    prisma.winners.findMany({
      where: { raffle_id: id },
      include: {
        raffle_entries: { select: { ticket_number: true } },
        profiles: { select: { full_name: true } },
      },
      orderBy: { prize_position: 'asc' },
    }),
  ]);

  // Transformar los ganadores existentes al formato esperado
  const formattedWinners = existingWinners.map(winner => ({
    entry_id: winner.entry_id ?? '',
    user_id: winner.user_id,
    ticket_number: winner.raffle_entries?.ticket_number || '',
    prize_position: winner.prize_position ?? 0,
    user_name: winner.profiles?.full_name || 'Participante'
  }));

  return (
    <RaffleExecution
      raffle={toPlain(raffle) as any}
      stats={{
        totalEntries,
        totalWinners,
      }}
      existingWinners={formattedWinners}
    />
  );
}
