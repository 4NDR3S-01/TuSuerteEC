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
  
  // Obtener datos del dashboard del participante
  const [
    { data: activeSubscriptions },
    { data: activeRaffles },
    { data: myEntries },
    { data: recentWinners },
    { data: alertEvent }
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('status', 'active')
      .eq('user_id', user.id),
    supabase
      .from('raffles')
      .select('*')
      .eq('status', 'active')
      .order('draw_date', { ascending: true }),
    supabase
      .from('raffle_entries')
      .select('*, raffles(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('winners')
      .select('*, raffles(title)')
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

  // Convertir el tipo User de get-user.ts al tipo esperado por ParticipantDashboard
  const dashboardUser = {
    id: user.id,
    email: user.email,
  };

  return (
    <ParticipantDashboard
      user={user}
      activeSubscriptions={activeSubscriptions || []}
      activeRaffles={activeRaffles || []}
      myEntries={myEntries || []}
      recentWinners={recentWinners || []}
      alertEvent={alertEvent || null}
    />
  );
}
