import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../../lib/auth/get-user';
import { redirect } from 'next/navigation';
import { ErrorPage } from '../../../../../components/ui/error-page';
import { RaffleDetailPage } from '../../../../../components/raffles/raffle-detail-page';
import { fetchActivePaymentMethods } from '../../../../../lib/payments/server';

export const dynamic = 'force-dynamic';

type Params = {
  id: string;
};

export default async function SorteoDetailPage({ params }: { params: Promise<Params> }) {
  // Await params first
  const { id } = await params;
  
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();

  // Fetch raffle details with specific fields and status filter
  const { data: raffle, error } = await supabase
    .from('raffles')
    .select('id, title, description, prize_description, prize_category, image_url, draw_date, entry_mode, max_entries_per_user, status')
    .eq('id', id)
    .in('status', ['active', 'closed', 'drawn'])
    .single();

  if (error || !raffle) {
    console.error('Error fetching raffle:', error);
    return (
      <ErrorPage
        title="Sorteo no encontrado"
        message="El sorteo que buscas no existe o no está disponible actualmente."
        action={{
          label: 'Ver todos los sorteos',
          href: '/app/sorteos',
        }}
      />
    );
  }

  // Fetch user's entries for this raffle
  const { data: userEntries, error: entriesError } = await supabase
    .from('raffle_entries')
    .select('id, ticket_number, is_winner, entry_source, created_at')
    .eq('raffle_id', id)
    .eq('user_id', user.id);

  if (entriesError) {
    console.error('Error fetching user entries:', entriesError);
  }

  // Fetch total entries count
  const { count: totalEntries, error: countError } = await supabase
    .from('raffle_entries')
    .select('id', { count: 'exact', head: true })
    .eq('raffle_id', id);

  if (countError) {
    console.error('Error fetching entries count:', countError);
  }

  // Ensure totalEntries is a number, default to 0 if null
  const entriesCount = totalEntries ?? 0;

  // Check if user has active subscription with expiration validation
  const now = new Date().toISOString();
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_end, plans(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', now);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
  }

  const paymentMethods = await fetchActivePaymentMethods('raffles');

  return (
    <RaffleDetailPage
      raffle={raffle}
      userEntries={userEntries || []}
      totalEntries={entriesCount}
      hasActiveSubscription={Boolean(subscriptions && subscriptions.length > 0)}
      paymentMethods={paymentMethods}
    />
  );
}
