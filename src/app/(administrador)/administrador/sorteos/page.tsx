import { getSupabaseServerClient } from '../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../lib/auth/get-user';
import { RafflesTableWrapper } from '../../../../components/admin/raffles-table-wrapper';

export default async function AdminRafflesPage() {
  await requireRole('admin');
  
  const supabase = await getSupabaseServerClient();
  
  // Obtener todos los sorteos con contador de participantes
  const [
    { data: raffles, error: rafflesError },
    { count: totalCount }
  ] = await Promise.all([
    supabase
      .from('raffles')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('raffles')
      .select('*', { count: 'exact', head: true })
  ]);

  if (rafflesError) {
    console.error('Error fetching raffles:', rafflesError);
  }

  // Obtener conteo de participantes para cada sorteo
  const rafflesWithCounts = await Promise.all(
    (raffles || []).map(async (raffle) => {
      const { count } = await supabase
        .from('raffle_entries')
        .select('*', { count: 'exact', head: true })
        .eq('raffle_id', raffle.id);
      
      return {
        ...raffle,
        _count: {
          raffle_entries: count || 0
        }
      };
    })
  );

  return <RafflesTableWrapper initialRaffles={rafflesWithCounts} totalCount={totalCount || 0} />;
}
