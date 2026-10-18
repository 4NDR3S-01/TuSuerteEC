import { prisma, toPlain } from '../../../../lib/db';
import { requirePageUser } from '../../../../lib/auth/get-user';
import { fetchActivePaymentMethods } from '../../../../lib/payments/server';
import { PlansPage } from '../../../../components/plans/plans-page';

export const dynamic = 'force-dynamic';

export default async function PlanesPage() {
  const user = await requirePageUser('/app/planes');

  const [plans, subscription, pending, paymentMethods] = await Promise.all([
    prisma.plans.findMany({
      where: { is_active: true },
      select: { id: true, name: true, description: true, price: true, currency: true, interval: true, benefits: true, is_featured: true, max_concurrent_raffles: true },
      orderBy: { price: 'asc' },
    }),
    prisma.subscriptions.findFirst({
      where: { user_id: user.id, status: 'active', current_period_end: { gt: new Date() } },
      orderBy: { current_period_end: 'desc' },
      select: { plan_id: true, current_period_end: true, plans: { select: { name: true } } },
    }),
    prisma.payment_transactions.count({ where: { user_id: user.id, transaction_type: 'subscription', status: 'pending' } }),
    fetchActivePaymentMethods('plans'),
  ]);

  return (
    <PlansPage
      plans={toPlain(plans)}
      activeSubscription={
        subscription
          ? { planId: subscription.plan_id, planName: subscription.plans?.name ?? 'actual', periodEnd: subscription.current_period_end!.toISOString() }
          : null
      }
      hasPendingRequest={pending > 0}
      paymentMethods={paymentMethods}
    />
  );
}
