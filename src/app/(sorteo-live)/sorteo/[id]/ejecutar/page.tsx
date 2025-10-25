import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../../lib/auth/get-user';
import { RaffleExecution } from '../../../../../components/admin/raffle-execution';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExecuteRafflePage({ params }: PageProps) {
  await requireRole('admin');
  
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  
  // Obtener datos del sorteo con campos específicos
  const { data: raffle, error } = await supabase
    .from('raffles')
    .select(`
      id,
      title,
      description,
      prize_description,
      prize_category,
      image_url,
      status,
      total_winners,
      draw_date,
      entry_mode,
      draw_seed,
      created_at
    `)
    .eq('id', id)
    .single();

  if (error || !raffle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
  const [
    { count: totalEntries },
    { count: totalWinners },
    { data: recentEntries },
    { data: existingWinners }
  ] = await Promise.all([
    supabase.from('raffle_entries').select('*', { count: 'exact', head: true }).eq('raffle_id', id),
    supabase.from('winners').select('*', { count: 'exact', head: true }).eq('raffle_id', id),
    supabase.from('raffle_entries').select('*, profiles(full_name)').eq('raffle_id', id).order('created_at', { ascending: false }).limit(10),
    supabase
      .from('winners')
      .select(`
        *,
        raffle_entries(
          ticket_number,
          profiles(full_name)
        )
      `)
      .eq('raffle_id', id)
      .order('prize_position', { ascending: true })
  ]);

  // Transformar los ganadores existentes al formato esperado
  const formattedWinners = existingWinners?.map(winner => ({
    entry_id: winner.entry_id,
    user_id: winner.user_id,
    ticket_number: winner.raffle_entries?.ticket_number || '',
    prize_position: winner.prize_position,
    user_name: winner.raffle_entries?.profiles?.full_name || 'Participante'
  })) || [];

  return (
    <RaffleExecution
      raffle={raffle}
      stats={{
        totalEntries: totalEntries || 0,
        totalWinners: totalWinners || 0,
        recentEntries: recentEntries || [],
      }}
      existingWinners={formattedWinners}
    />
  );
}
