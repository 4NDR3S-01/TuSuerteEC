import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';
import { RafflesPage } from '../../../../components/raffles/raffles-page';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SorteosPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();

  // Fetch all active raffles
  const { data: raffles, error } = await supabase
    .from('raffles')
    .select('id, title, description, prize_description, prize_category, draw_date, entry_mode, max_entries_per_user, status, image_url, is_trending')
    .eq('status', 'active')
    .order('draw_date', { ascending: true });

  if (error) {
    console.error('Error fetching raffles:', error);
    // Return empty array in case of error to show empty state
    return <RafflesPage raffles={[]} />;
  }

  return <RafflesPage raffles={raffles || []} />;
}
