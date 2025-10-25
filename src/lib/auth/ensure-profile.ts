import { getSupabaseServerClient } from '../supabase/server';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

type NormalizedUserMetadata = {
  full_name: string;
  id_number: string;
  phone_number: string;
  city_id: number | null;
  parish_id: number | null;
  address: string;
  role: string;
};

function normalizeMetadata(user: SupabaseAuthUser): NormalizedUserMetadata {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const getString = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  };

  const getNumberOrNull = (...keys: string[]): number | null => {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  };

  return {
    full_name: getString('full_name', 'fullName', 'name') ?? (user.email ?? 'Usuario'),
    id_number: getString('id_number', 'idNumber', 'identification') ?? '0000000000',
    phone_number: getString('phone_number', 'phoneNumber', 'phone') ?? '+593000000000',
    city_id: getNumberOrNull('city_id', 'cityId'),
    parish_id: getNumberOrNull('parish_id', 'parishId'),
    address: getString('address', 'streetAddress', 'location') ?? 'Dirección no especificada',
    role: getString('role', 'userRole') ?? 'participant',
  };
}

/**
 * Asegura que el usuario tenga un perfil en la tabla profiles
 * Si no existe, lo crea automáticamente desde user_metadata
 */
export async function ensureUserProfile(user: SupabaseAuthUser): Promise<boolean> {
  if (!user) {
    return false;
  }

  const userId = user.id;
  const supabase = await getSupabaseServerClient();
  
  try {
    // Verificar si ya tiene perfil - maybeSingle no lanza error si no encuentra datos
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Si hay error al verificar (no relacionado con "no encontrado"), retornar false
    if (checkError) {
      console.error('Error checking existing profile:', checkError);
      return false;
    }

    // Si ya existe el perfil, retornar true
    if (existingProfile) {
      return true;
    }

    const metadata = normalizeMetadata(user);

    // Crear perfil automáticamente usando upsert para evitar duplicados
    const { error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: metadata.full_name,
        id_number: metadata.id_number,
        phone_number: metadata.phone_number,
        city_id: metadata.city_id,
        parish_id: metadata.parish_id,
        address: metadata.address,
        role: metadata.role
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (insertError) {
      // Si el error es por duplicado, es aceptable (race condition)
      if (insertError.code === '23505') {
        console.log('Profile already exists (race condition handled)');
        return true;
      }
      console.error('Error creating profile:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in ensureUserProfile:', error);
    return false;
  }
}
