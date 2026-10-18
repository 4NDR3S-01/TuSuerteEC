import { requirePagePermission } from '../../../../lib/auth/get-user';
import { TeamAccountPage } from '../../../../components/settings/team-account-page';

export const dynamic = 'force-dynamic';

export default async function StaffAccountPage() {
  return <TeamAccountPage user={await requirePagePermission('staff_panel.access', '/staff/cuenta')} />;
}
