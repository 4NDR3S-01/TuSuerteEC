import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';
import { redirect } from 'next/navigation';
import { SettingsPage } from '../../../../components/settings/settings-page';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }

  const supabase = await getSupabaseServerClient();
  
  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Obtener suscripciones activas no expiradas
  const now = new Date().toISOString();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', now);

  return (
    <SettingsPage
      user={user}
      profile={profile}
      subscriptions={subscriptions || []}
    />
  );
}
