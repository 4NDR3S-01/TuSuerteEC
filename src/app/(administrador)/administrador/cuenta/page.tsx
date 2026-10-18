import { requirePagePermission } from '../../../../lib/auth/get-user';
import { TeamAccountPage } from '../../../../components/settings/team-account-page';

export const dynamic = 'force-dynamic';

export default async function AdminAccountPage() {
  return <TeamAccountPage user={await requirePagePermission('admin_panel.access', '/administrador/cuenta')} />;
}
