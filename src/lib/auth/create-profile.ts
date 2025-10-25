import { getSupabaseBrowserClient } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreateProfileData = {
  userId: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  cityId?: number | null;
  parishId?: number | null;
  address: string;
  role?: 'participant' | 'staff' | 'admin';
};

/**
 * Crea un perfil de usuario de forma robusta
 * Intenta múltiples estrategias para asegurar que el perfil se cree
 */
export async function createUserProfile(data: CreateProfileData): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  
  try {
    // Estrategia 1: Intentar crear perfil completo
    const { error: profileError } = await supabase.rpc('create_user_profile', {
      user_id: data.userId,
      full_name: data.fullName,
      id_number: data.idNumber,
      phone_number: data.phoneNumber,
      user_email: data.email,
      city_id: data.cityId,
      parish_id: data.parishId,
      address: data.address,
      user_role: data.role || 'participant'
    });

    if (!profileError) {
      await syncAuthMetadata(supabase, data);
      return { success: true };
    }

    console.warn('Error creating full profile, trying fallback:', profileError);

    // Estrategia 2: Crear perfil básico como fallback
    const { error: fallbackError } = await supabase.rpc('get_or_create_profile', {
      user_id: data.userId
    });

    if (!fallbackError) {
      await syncAuthMetadata(supabase, data);
      return { success: true };
    }

    console.warn('Error creating fallback profile, trying direct insert:', fallbackError);

    // Estrategia 3: Insertar directamente en la tabla
    const { error: directError } = await supabase
      .from('profiles')
      .insert({
        id: data.userId,
        full_name: data.fullName,
        id_number: data.idNumber,
        phone_number: data.phoneNumber,
        email: data.email,
        city_id: data.cityId,
        parish_id: data.parishId,
        address: data.address,
        role: data.role || 'participant'
      });

    if (!directError) {
      await syncAuthMetadata(supabase, data);
      return { success: true };
    }

    console.error('All profile creation strategies failed:', directError);
    return { success: false, error: directError.message };

  } catch (error) {
    console.error('Unexpected error in profile creation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

async function syncAuthMetadata(supabase: SupabaseClient, data: CreateProfileData) {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName,
        id_number: data.idNumber,
        phone_number: data.phoneNumber,
        email: data.email,
        city_id: data.cityId ?? null,
        parish_id: data.parishId ?? null,
        address: data.address,
        role: data.role ?? 'participant',
      },
    });

    if (error) {
      console.warn('Error syncing user metadata:', error);
    }
  } catch (error) {
    console.warn('Unexpected error syncing user metadata:', error);
  }
}

/**
 * Verifica si un usuario tiene perfil
 */
export async function checkUserProfile(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  
  try {
    const { data, error } = await supabase.rpc('user_has_profile', {
      user_id: userId
    });
    
    if (error) {
      console.error('Error checking profile:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Unexpected error checking profile:', error);
    return false;
  }
}
