import { requirePagePermission } from '@/lib/auth/get-user';
import { prisma, toPlain } from '@/lib/db';
import type { PaymentMethod } from '@/lib/payments/types';
import PaymentMethodsManagement from '@/components/admin/payment-methods-management';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
  await requirePagePermission('payment_methods.manage', '/administrador/pagos/metodos');

  const methods = await prisma.payment_methods.findMany({
    orderBy: { created_at: 'desc' },
  });

  return (
    <PaymentMethodsManagement initialMethods={toPlain(methods) as PaymentMethod[]} />
  );
}
