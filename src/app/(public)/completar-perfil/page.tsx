import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import { CompleteProfileForm } from '../../../components/auth/complete-profile-form';

export default async function CompleteProfilePage() {
  const supabase = await getSupabaseServerClient();
  
  // Verificar si el usuario está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/iniciar-sesion');
  }
  
  // Verificar si ya tiene perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();
  
  if (profile) {
    // Si ya tiene perfil, redirigir al dashboard
    redirect('/app');
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <CompleteProfileForm user={user} />
    </div>
  );
}
