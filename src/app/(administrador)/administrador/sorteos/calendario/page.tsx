import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../../lib/auth/get-user';
import { RafflesCalendar } from '../../../../../components/admin/raffles-calendar';

export default async function RafflesCalendarPage() {
  await requireRole('admin');
  
  const supabase = await getSupabaseServerClient();

  // Obtener todos los sorteos
  const { data: raffles, error } = await supabase
    .from('raffles')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching raffles:', error);
  }

  return (
    <div className="min-h-screen p-6">
      <RafflesCalendar raffles={raffles || []} />
    </div>
  );
}
