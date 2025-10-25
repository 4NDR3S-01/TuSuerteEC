import { getSupabaseServerClient } from '../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../lib/auth/get-user';
import { PlansTable } from '../../../../components/admin/plans-table';

export default async function AdminPlansPage() {
  await requireRole('admin');
  
  const supabase = await getSupabaseServerClient();
  
  // Obtener todos los planes
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
  }

  return (
    <div className="min-h-screen p-6">
      <PlansTable initialPlans={plans || []} />
    </div>
  );
}
