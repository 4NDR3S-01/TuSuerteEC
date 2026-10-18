import { prisma, toPlain } from '../../../../lib/db';
import { requirePagePermission } from '../../../../lib/auth/get-user';
import { PlansTable } from '../../../../components/admin/plans-table';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  await requirePagePermission('plans.manage', '/administrador/planes');
  const plans = await prisma.plans.findMany({
    orderBy: { price: 'asc' },
    include: { _count: { select: { subscriptions: { where: { status: 'active', current_period_end: { gt: new Date() } } } } } },
  });
  return <PlansTable initialPlans={toPlain(plans)} />;
}
