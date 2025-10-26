import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';
import { PlansPage } from '../../../../components/plans/plans-page';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlanesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();

  // Fetch all available plans with specific fields (using real schema)
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, name, description, price, currency, interval, benefits, is_active, is_featured, max_concurrent_raffles')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (plansError) {
    console.error('Error fetching plans:', plansError);
  }

  // Fetch user's active subscriptions with expiration validation
  const now = new Date().toISOString();
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, current_period_start, current_period_end, plans(id, name, description, price, currency, interval, benefits, is_active, is_featured, max_concurrent_raffles)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', now);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
  }

  return <PlansPage plans={plans || []} userSubscriptions={subscriptions || []} />;
}
