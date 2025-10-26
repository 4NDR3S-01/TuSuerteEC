import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { requireRole } from '../../../lib/auth/get-user';
import { AdminDashboard } from '../../../components/admin/admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  await requireRole('admin');

  const supabase = await getSupabaseServerClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date().toISOString();

  // Obtener métricas del dashboard
  const [
    { count: totalUsers },
    { count: newUsersLast30Days },
    { count: activeSubscriptions },
    { count: activeRaffles },
    { count: totalRaffles },
    { count: pendingWinners },
    { data: recentRaffles },
    { data: upcomingEvents },
    { data: recentPaymentsRaw },
    totalRevenueResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('current_period_end', now),
    supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('raffles').select('*', { count: 'exact', head: true }),
    supabase.from('winners').select('*', { count: 'exact', head: true }).eq('status', 'pending_contact'),
    supabase.from('raffles').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('live_events').select('id, title, start_at, status').eq('is_visible', true).order('start_at', { ascending: true }).limit(3),
    supabase.from('payment_transactions').select('id, amount, status, created_at, user_id').order('created_at', { ascending: false }).limit(5),
    supabase.rpc('get_total_revenue' as any).single() as any,
  ]);

  const totalRevenue = (totalRevenueResult?.data as any)?.total || 0;

  // Obtener perfiles de usuarios para los pagos recientes
  const recentPaymentsWithProfiles = await Promise.all(
    (recentPaymentsRaw || []).map(async (payment: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payment.user_id)
        .single();
      
      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at,
        profiles: profile ? { full_name: profile.full_name } : null,
      };
    })
  );

  const recentPayments = recentPaymentsWithProfiles;

  return (
    <AdminDashboard
      metrics={{
        totalUsers,
        newUsersLast30Days,
        activeSubscriptions,
        activeRaffles,
        totalRaffles,
        pendingWinners,
        totalRevenue,
      }}
      recentRaffles={recentRaffles}
      upcomingEvents={upcomingEvents}
      recentPayments={recentPayments}
    />
  );
}
