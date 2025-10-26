import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/get-user';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import PaymentTransactionsManagement from '@/components/admin/payment-transactions-management';

export const dynamic = 'force-dynamic';

export default async function TransaccionesPage() {
  await requireRole('admin').catch((error) => {
    console.error('[admin][transactions] access denied', error);
    redirect('/iniciar-sesion');
  });

  const supabase = await getSupabaseServerClient();

  // Obtener todas las transacciones
  const { data: transactions, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin][transactions] error loading:', error);
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">
            Error al cargar las transacciones
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">{error.message}</p>
        </div>
      </div>
    );
  }

  // Obtener información adicional de usuarios, métodos de pago, sorteos y suscripciones
  const transactionsWithDetails = await Promise.all(
    (transactions || []).map(async (transaction) => {
      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, id_number')
        .eq('id', transaction.user_id)
        .single();

      // Obtener método de pago
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('id, name, type, icon')
        .eq('id', transaction.payment_method_id)
        .single();

      // Obtener sorteo si existe
      let raffle = null;
      if (transaction.raffle_id) {
        const { data: raffleData } = await supabase
          .from('raffles')
          .select('id, title')
          .eq('id', transaction.raffle_id)
          .single();
        raffle = raffleData;
      }

      // Obtener suscripción y plan si existe
      let subscription = null;
      if (transaction.subscription_id) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select(`
            id,
            plan_id,
            plans (
              name
            )
          `)
          .eq('id', transaction.subscription_id)
          .single();
        subscription = subData;
      }

      return {
        ...transaction,
        profiles: profile,
        payment_methods: paymentMethod,
        raffles: raffle,
        subscriptions: subscription,
      };
    })
  );

  return <PaymentTransactionsManagement initialTransactions={transactionsWithDetails} />;
}
