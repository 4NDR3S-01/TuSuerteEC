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
    supabase.from('payments').select('id, amount, status, created_at, user_id, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.rpc('get_total_revenue' as any).single() as any,
  ]);

  const totalRevenue = (totalRevenueResult?.data as any)?.total || 0;

  // Normalize recentPayments profiles to match Payment type: single object or null
  const recentPayments = (recentPaymentsRaw || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    created_at: p.created_at,
    profiles: Array.isArray(p.profiles)
      ? (p.profiles[0] ? { full_name: p.profiles[0].full_name } : null)
      : (p.profiles ?? null),
  }));

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
