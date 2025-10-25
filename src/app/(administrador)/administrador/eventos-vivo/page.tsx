import { getSupabaseServerClient } from '../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../lib/auth/get-user';
import { LiveEventsTableWrapper } from '../../../../components/admin/live-events-table-wrapper';

export default async function AdminLiveEventsPage() {
  await requireRole('admin');
  
  const supabase = await getSupabaseServerClient();
  
  // Obtener todos los eventos con sorteos asociados
  const [
    { data: events, error: eventsError },
    { count: totalCount }
  ] = await Promise.all([
    supabase
      .from('live_events')
      .select(`
        *,
        raffles:raffle_id (
          id,
          title
        )
      `)
      .order('start_at', { ascending: false }),
    supabase
      .from('live_events')
      .select('*', { count: 'exact', head: true })
  ]);

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  // Obtener sorteos disponibles para asociar
  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, title')
    .in('status', ['active', 'draft'])
    .order('title', { ascending: true });

  return <LiveEventsTableWrapper 
    initialEvents={events || []} 
    totalCount={totalCount || 0}
    availableRaffles={raffles || []}
  />;
}
