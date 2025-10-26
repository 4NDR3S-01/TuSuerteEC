'use server';

import { getSupabaseServerClient } from '../supabase/server';
import type { PaymentMethod, PaymentScope } from './types';

export async function fetchActivePaymentMethods(scope: PaymentScope): Promise<PaymentMethod[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, type, description, icon, is_active, instructions, config, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[payments] Error fetching payment methods:', error);
    return [];
  }

  return (data ?? []).filter((method) => {
    const config = (method.config ?? {}) as any;
    const scopes: string[] = Array.isArray(config?.scopes) ? config.scopes : [];
    return scopes.includes(scope);
  }) as PaymentMethod[];
}

export async function fetchPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, type, description, icon, is_active, instructions, config, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[payments] Error fetching payment method by id:', error);
    return null;
  }

  return data as PaymentMethod | null;
}

