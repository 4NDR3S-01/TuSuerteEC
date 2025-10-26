import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';
import { redirect } from 'next/navigation';
import { MyTicketsPage } from '../../../../components/dashboard/my-tickets-page';

export const dynamic = 'force-dynamic';

export default async function BoletosPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();
  
  // Fetch user's raffle entries with specific fields
  const { data: entries, error } = await supabase
    .from('raffle_entries')
    .select(`
      id,
      ticket_number,
      created_at,
      is_winner,
      entry_source,
      raffles!inner (
        id,
        title,
        prize_description,
        prize_category,
        image_url,
        draw_date,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching raffle entries:', error);
  }

  return <MyTicketsPage entries={entries || []} />;
}
