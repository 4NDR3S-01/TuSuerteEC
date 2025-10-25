import { getSupabaseServerClient } from '../../../../lib/supabase/server';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../../lib/auth/get-user';
import { PaymentsTable } from '../../../../components/admin/payments-table';

export const metadata = {
  title: 'Pagos | Admin - TuSuerte',
  description: 'Gestiona todas las transacciones y reembolsos de la plataforma',
};

export default async function PaymentsPage() {
  await requireRole('admin');

  const supabase = await getSupabaseServerClient();

  // Obtener todos los pagos con información de usuarios y suscripciones
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar pagos:', error);
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
            Error al cargar los pagos
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">{error.message}</p>
        </div>
      </div>
    );
  }

  // Obtener información adicional de usuarios y suscripciones
  const paymentsWithDetails = await Promise.all(
    (payments || []).map(async (payment) => {
      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', payment.user_id)
        .single();

      // Obtener suscripción y plan si existe
      let subscription = null;
      if (payment.subscription_id) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select(`
            id,
            plan_id,
            plans (
              name
            )
          `)
          .eq('id', payment.subscription_id)
          .single();
        subscription = subData;
      }

      return {
        ...payment,
        profiles: profile,
        subscriptions: subscription,
      };
    })
  );

  return <PaymentsTable payments={paymentsWithDetails} />;
}
