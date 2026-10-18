import { requirePagePermission } from '@/lib/auth/get-user';
import { loadTransactionsForReview } from '@/lib/queries/operations';
import PaymentTransactionsManagement from '@/components/admin/payment-transactions-management';

export const dynamic = 'force-dynamic';

export default async function StaffPaymentsPage() {
  const user = await requirePagePermission('payments.review', '/staff/pagos');
  return <PaymentTransactionsManagement initialTransactions={(await loadTransactionsForReview()) as any} currentUserId={user.id} />;
}
