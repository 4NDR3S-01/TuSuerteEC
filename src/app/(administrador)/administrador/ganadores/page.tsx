import { requireRole } from '../../../../lib/auth/get-user';
export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { WinnersTable } from '../../../../components/admin/winners-table';

export default async function AdminWinnersPage() {
  await requireRole('admin');

  const supabase = await getSupabaseServerClient();

  // Obtener ganadores sin JOINs automáticos
  const winnersResponse = await supabase
    .from('winners')
    .select('*')
    .order('created_at', { ascending: false });

  if (winnersResponse.error) {
    console.error('Error fetching winners:', winnersResponse.error);
    return <div>Error al cargar ganadores</div>;
  }

  const winnersData = winnersResponse.data ?? [];

  // Obtener IDs únicos de sorteos y usuarios
  const raffleIds = [...new Set(winnersData.map(w => w.raffle_id))];
  const userIds = [...new Set(winnersData.map(w => w.user_id))];

  // Obtener datos de sorteos
  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, title, draw_date')
    .in('id', raffleIds);

  // Obtener datos de perfiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number')
    .in('id', userIds);

  // Crear mapas para búsqueda rápida
  const rafflesMap = new Map((raffles || []).map(r => [r.id, r]));
  const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

  // Transformar los datos combinando la información
  const winners = winnersData.map((w: any) => ({
    ...w,
    raffles: rafflesMap.get(w.raffle_id) || { id: w.raffle_id, title: 'Sorteo desconocido', draw_date: null },
    profiles: profilesMap.get(w.user_id) || { id: w.user_id, full_name: 'Usuario desconocido', email: '', phone_number: '' },
  }));

  return (
    <div className="space-y-8">
      <WinnersTable winners={winners} />
    </div>
  );
}
