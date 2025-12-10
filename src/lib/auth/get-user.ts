import { getSupabaseServerClient } from '../supabase/server';
import { canAccessAdmin, canAccessStaff, canAccessDashboard } from './roles';
import { ensureUserProfile } from './ensure-profile';

export type User = {
  id: string;
  email: string;
  role: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  cityId?: number;
  parishId?: number;
  address: string;
};

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await getSupabaseServerClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // No registrar errores de sesión faltante como errores críticos
      // AuthSessionMissingError es esperado en rutas públicas
      if (error.name !== 'AuthSessionMissingError' && error.message !== 'Auth session missing!') {
        console.error('Error getting user from Supabase:', error);
      }
      return null;
    }
    
    if (!user) {
      return null;
    }

    // Intentar obtener perfil desde la tabla profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile && !profileError) {
      return {
        id: user.id,
        email: user.email!,
        role: profile.role,
        fullName: profile.full_name,
        idNumber: profile.id_number,
        phoneNumber: profile.phone_number,
        cityId: profile.city_id,
        parishId: profile.parish_id,
        address: profile.address,
      };
    }

    // Si no hay perfil, intentar crearlo automáticamente
    const profileCreated = await ensureUserProfile(user);
    
    if (profileCreated) {
      // Intentar obtener el perfil recién creado
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (newProfile && !newProfileError) {
        return {
          id: user.id,
          email: user.email!,
          role: newProfile.role,
          fullName: newProfile.full_name,
          idNumber: newProfile.id_number,
          phoneNumber: newProfile.phone_number,
          cityId: newProfile.city_id,
          parishId: newProfile.parish_id,
          address: newProfile.address,
        };
      }
    }

    // Como último recurso, usar datos de user_metadata
    const metadata = user.user_metadata || {};
    
    return {
      id: user.id,
      email: user.email!,
      role: metadata.role || 'participant',
      fullName: metadata.full_name || 'Usuario',
      idNumber: metadata.id_number || '0000000000',
      phoneNumber: metadata.phone_number || '+593000000000',
      cityId: metadata.city_id ? Number(metadata.city_id) : undefined,
      parishId: metadata.parish_id ? Number(metadata.parish_id) : undefined,
      address: metadata.address || 'Dirección no especificada',
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  return user;
}

export async function requireRole(role: 'admin' | 'staff' | 'participant'): Promise<User> {
  const user = await requireAuth();
  
  const roleChecks = {
    admin: canAccessAdmin,
    staff: canAccessStaff,
    participant: canAccessDashboard,
  };
  
  if (!roleChecks[role](user.role)) {
    throw new Error(`Acceso denegado. Se requiere rol: ${role}`);
  }
  
  return user;
}
