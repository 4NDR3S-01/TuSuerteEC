import { requirePagePermission } from '../../../../lib/auth/get-user';
import { loadWinners } from '../../../../lib/queries/operations';
import { WinnersTable } from '../../../../components/admin/winners-table';

export const dynamic = 'force-dynamic';

export default async function AdminWinnersPage() {
  await requirePagePermission('winners.manage', '/administrador/ganadores');
  return <WinnersTable winners={(await loadWinners()) as any} />;
}
