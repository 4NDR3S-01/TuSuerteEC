import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/get-user';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import PaymentMethodsManagement from '@/components/admin/payment-methods-management';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
  await requireRole('admin').catch((error) => {
    console.error('[admin][payment-methods] access denied', error);
    redirect('/iniciar-sesion');
  });

  const supabase = await getSupabaseServerClient();

  const { data: methods, error } = await supabase
    .from('payment_methods')
    .select('id, name, type, description, icon, is_active, instructions, config, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin][payment-methods] error loading methods:', error);
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
            Error al cargar los métodos de pago
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <PaymentMethodsManagement initialMethods={methods || []} />
  );
}

