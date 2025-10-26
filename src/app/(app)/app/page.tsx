import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { getCurrentUser } from '../../../lib/auth/get-user';
import { redirect } from 'next/navigation';
import { ParticipantDashboard } from '../../../components/participant/participant-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();
  const now = new Date().toISOString();
  
  // Obtener datos del dashboard del participante con queries optimizadas
  const [
    { data: activeSubscriptions },
    { data: activeRaffles },
    { data: myEntries },
    { data: recentWinners },
    { data: alertEvent }
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, status, current_period_end, plans(id, name, price, currency, interval)')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .gt('current_period_end', now),
    supabase
      .from('raffles')
      .select('id, title, description, prize_description, prize_category, draw_date, entry_mode, max_entries_per_user, status')
      .eq('status', 'active')
      .order('draw_date', { ascending: true }),
    supabase
      .from('raffle_entries')
      .select('id, raffle_id, ticket_number, is_winner, entry_source, created_at, raffles(id, title, prize_description, prize_category, draw_date, entry_mode, max_entries_per_user, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('winners')
      .select('id, user_id, prize_position, status, created_at, raffles(title)')
      .eq('status', 'prize_delivered')
      .order('created_at', { ascending: false })
      .limit(5),
    // Obtener evento activo como alerta (solo uno a la vez)
    supabase
      .from('live_events')
      .select('id, title, description, start_at, stream_url, status')
      .eq('show_as_alert', true)
      .eq('is_visible', true)
      .in('status', ['scheduled', 'live'])
      .order('start_at', { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  // Transform data to match expected types (Supabase returns arrays for joins, we need single objects)
  const transformedSubscriptions = (activeSubscriptions || []).map(sub => ({
    ...sub,
    plans: Array.isArray(sub.plans) ? sub.plans[0] : sub.plans
  }));

  const transformedEntries = (myEntries || []).map(entry => ({
    ...entry,
    raffles: Array.isArray(entry.raffles) ? entry.raffles[0] : entry.raffles
  }));

  const transformedWinners = (recentWinners || []).map(winner => ({
    ...winner,
    raffles: Array.isArray(winner.raffles) ? winner.raffles[0] : winner.raffles
  }));

  return (
    <ParticipantDashboard
      user={user}
      activeSubscriptions={transformedSubscriptions as any}
      activeRaffles={activeRaffles || []}
      myEntries={transformedEntries as any}
      recentWinners={transformedWinners as any}
      alertEvent={alertEvent || null}
    />
  );
}
