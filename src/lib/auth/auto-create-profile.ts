import { getSupabaseServerClient } from '../supabase/server';

/**
 * Crea automáticamente un perfil si el usuario tiene datos en user_metadata
 * pero no tiene perfil en la tabla profiles
 */
export async function autoCreateProfileIfNeeded(user: any): Promise<boolean> {
  if (!user || !user.user_metadata) {
    return false;
  }

  const supabase = await getSupabaseServerClient();
  
  try {
    // Verificar si ya tiene perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return true; // Ya tiene perfil
    }

    // Crear perfil automáticamente
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata.full_name || 'Usuario',
        id_number: user.user_metadata.id_number || '0000000000',
        phone_number: user.user_metadata.phone_number || '+593000000000',
        city_id: user.user_metadata.city_id ? Number(user.user_metadata.city_id) : null,
        parish_id: user.user_metadata.parish_id ? Number(user.user_metadata.parish_id) : null,
        address: user.user_metadata.address || 'Dirección no especificada',
        role: user.user_metadata.role || 'participant'
      });

    if (error) {
      console.error('Error auto-creating profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in autoCreateProfileIfNeeded:', error);
    return false;
  }
}
