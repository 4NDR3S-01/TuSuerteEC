'use server';

import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getCurrentUser } from '../../../../../lib/auth/get-user';
import { revalidatePath } from 'next/cache';

/**
 * Server Action para comprar un boleto de sorteo
 * Usa la función RPC segura que previene race conditions
 */
export async function purchaseRaffleTicket(raffleId: string) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser();
    if (!user) {
      return { 
        success: false, 
        error: 'Debes iniciar sesión para participar en sorteos' 
      };
    }

    const supabase = await getSupabaseServerClient();

    // Usar función RPC segura con locks atómicos
    const { data, error } = await supabase.rpc('create_raffle_entry_safe', {
      p_raffle_id: raffleId,
      p_user_id: user.id,
      p_entry_source: 'manual_purchase',
      p_subscription_id: null
    });

    if (error) {
      console.error('[purchaseRaffleTicket] Error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    // Revalidar la página del sorteo para mostrar la nueva entrada
    revalidatePath(`/app/sorteos/${raffleId}`);
    revalidatePath('/app');

    return { 
      success: true, 
      entryId: data,
      message: 'Tu entrada ha sido registrada exitosamente' 
    };

  } catch (error) {
    console.error('[purchaseRaffleTicket] Excepción:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al procesar la compra' 
    };
  }
}

/**
 * Server Action para verificar si el usuario puede participar en un sorteo
 * Verifica límites de entradas y eligibilidad
 */
export async function checkRaffleEligibility(raffleId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { 
        eligible: false, 
        reason: 'not_authenticated' 
      };
    }

    const supabase = await getSupabaseServerClient();

    // Obtener información del sorteo
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, status, entry_mode, max_entries_per_user')
      .eq('id', raffleId)
      .single();

    if (raffleError || !raffle) {
      return { 
        eligible: false, 
        reason: 'raffle_not_found' 
      };
    }

    if (raffle.status !== 'active') {
      return { 
        eligible: false, 
        reason: 'raffle_not_active' 
      };
    }

    // Verificar si el modo de entrada permite compra manual
    if (raffle.entry_mode === 'subscribers_only') {
      // Verificar si tiene suscripción activa
      const now = new Date().toISOString();
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', now)
        .maybeSingle();

      if (!subscription) {
        return { 
          eligible: false, 
          reason: 'subscription_required' 
        };
      }
    }

    // Verificar límite de entradas
    if (raffle.max_entries_per_user) {
      const { count, error: countError } = await supabase
        .from('raffle_entries')
        .select('id', { count: 'exact', head: true })
        .eq('raffle_id', raffleId)
        .eq('user_id', user.id);

      if (countError) {
        console.error('[checkRaffleEligibility] Error al contar entradas:', countError);
        return { 
          eligible: false, 
          reason: 'error_checking_entries' 
        };
      }

      if (count !== null && count >= raffle.max_entries_per_user) {
        return { 
          eligible: false, 
          reason: 'max_entries_reached',
          currentEntries: count,
          maxEntries: raffle.max_entries_per_user
        };
      }

      return {
        eligible: true,
        currentEntries: count || 0,
        maxEntries: raffle.max_entries_per_user
      };
    }

    return { 
      eligible: true,
      currentEntries: 0,
      maxEntries: null
    };

  } catch (error) {
    console.error('[checkRaffleEligibility] Excepción:', error);
    return { 
      eligible: false, 
      reason: 'unknown_error' 
    };
  }
}
