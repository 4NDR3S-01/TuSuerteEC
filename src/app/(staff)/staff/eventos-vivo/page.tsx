import { requirePagePermission } from '../../../../lib/auth/get-user';
import { loadLiveEvents } from '../../../../lib/queries/operations';
import { LiveEventsTableWrapper } from '../../../../components/admin/live-events-table';

export const dynamic = 'force-dynamic';

export default async function StaffLiveEventsPage() {
  await requirePagePermission('live_events.manage', '/staff/eventos-vivo');
  const { events, totalCount, raffles } = await loadLiveEvents();
  return <LiveEventsTableWrapper initialEvents={events as any} totalCount={totalCount} availableRaffles={raffles} />;
}
