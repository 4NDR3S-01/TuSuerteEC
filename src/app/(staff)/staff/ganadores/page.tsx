import { requirePagePermission } from '../../../../lib/auth/get-user';
import { loadWinners } from '../../../../lib/queries/operations';
import { WinnersTable } from '../../../../components/admin/winners-table';

export const dynamic = 'force-dynamic';

export default async function StaffWinnersPage() {
  await requirePagePermission('winners.manage', '/staff/ganadores');
  return <WinnersTable winners={(await loadWinners()) as any} />;
}
